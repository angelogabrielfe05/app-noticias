// NEWs — lógica do app.
// Segurança: títulos e resumos vêm de sites de terceiros, então a tela é montada só com
// createElement/textContent (nunca innerHTML com dados), e os links passam por linkSeguro().
import { estaLida, marcarLida, herdarLidas, listarSalvos, estaSalva, alternarSalva, ultimaAba, lembrarAba } from './lib/armazenamento.js';
import { quando, dataCompleta, hora, valorIndicador, variacaoIndicador } from './lib/formatar.js';
import { carregarGlossario, buscarTermo, dividirEmTermos } from './lib/termos.js';

const ABAS = {
  politica: { nome: 'Política do Brasil', painel: null },
  economia: { nome: 'Economia', painel: 'economia' },
  mercado: { nome: 'Mercado e bolsa', painel: 'mercado' },
  ia: { nome: 'Inteligência artificial', painel: null },
};
const HORAS_PARA_AVISO_DESATUALIZADO = 12;
// Verde/vermelho só onde "subir" é claramente bom (bolsa). Juros, inflação, dólar e PIB ficam neutros
// (PIB de 1,1% para 0,5% ainda é crescimento; em vermelho pareceria queda).
const COLORIR_VARIACAO = new Set(['ibovespa', 'ifix', 'sp500']);
const dataDeHoje = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' });

const estado = { noticias: null, indicadores: null, carregando: true, erro: null };
const $ = (sel) => document.querySelector(sel);
const conteudo = $('#conteudo');

// ---------------------------------------------------------------------------
// Ajudantes de tela
// ---------------------------------------------------------------------------

/** Cria um elemento. Textos viram nós de texto (nunca HTML). */
function el(tag, atributos = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor == null || valor === false) continue;
    if (nome === 'class') e.className = valor;
    else if (nome === 'texto') e.textContent = valor;
    else e.setAttribute(nome, valor === true ? '' : valor);
  }
  for (const f of filhos.flat()) {
    if (f == null || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

const linkSeguro = (url) => (/^https?:\/\//i.test(url || '') ? url : null);

/** Texto com os termos do glossário viram botões que abrem a explicação. */
function textoComTermos(texto, jaUsados) {
  return dividirEmTermos(texto, jaUsados).map((p) =>
    p.termo
      ? el('button', { type: 'button', class: 'termo', 'data-acao': 'termo', 'data-termo': p.termo.id, 'aria-label': `${p.texto}: o que é?` }, p.texto)
      : document.createTextNode(p.texto));
}

function abaAtual() {
  const hash = location.hash.replace('#', '');
  if (hash === 'salvos' || ABAS[hash]) return hash;
  return ABAS[ultimaAba()] ? ultimaAba() : 'politica';
}

const noticiasDaAba = (aba) => estado.noticias?.abas?.[aba]?.itens || [];
const acharNoticia = (id) => {
  for (const aba of Object.keys(ABAS)) {
    const n = noticiasDaAba(aba).find((x) => x.id === id);
    if (n) return { ...n, aba };
  }
  return listarSalvos().find((x) => x.id === id) || null;
};

// ---------------------------------------------------------------------------
// Fotos: foto da notícia (reduzida pelo robô) ou, sem foto, uma "capa editorial" na cor da aba
// ---------------------------------------------------------------------------
const CACHE_FOTOS = 'news-fotos'; // mesmo nome usado no sw.js

function iconeDaAba(aba) {
  const svg = document.querySelector(`.abas a[data-aba="${aba}"] svg`);
  return svg ? svg.cloneNode(true) : null;
}

function capaEditorial(n, tamanho) {
  return el('div', { class: `capa capa-${tamanho}`, 'aria-hidden': 'true' },
    iconeDaAba(n.aba),
    tamanho === 'grande' ? el('span', { class: 'capa-legenda' }, [ABAS[n.aba]?.nome, n.fonte].filter(Boolean).join(' · ')) : null);
}

function midia(n, tamanho, prioridade = false) {
  const url = linkSeguro(n.foto?.[tamanho]);
  if (!url) return capaEditorial(n, tamanho);
  const grande = tamanho === 'grande';
  const img = el('img', {
    src: url, alt: '', width: grande ? 800 : 192, height: grande ? 450 : 192,
    loading: prioridade ? 'eager' : 'lazy', fetchpriority: prioridade ? 'high' : null, decoding: 'async',
    referrerpolicy: 'no-referrer', crossorigin: 'anonymous',
  });
  const figura = el('figure', { class: `foto foto-${tamanho}` }, img, grande ? el('figcaption', {}, `Foto: ${n.fonte}`) : null);
  // Se a foto não carregar (fonte fora do ar, sem internet e sem cópia), mostra a capa editorial
  img.addEventListener('error', () => figura.replaceWith(capaEditorial(n, tamanho)), { once: true });
  return figura;
}

/**
 * Fotos para ler sem internet: guarda as da edição atual (~1 MB) em segundo plano
 * e apaga do celular as que não são mais usadas. Respeita o modo "economia de dados".
 */
async function sincronizarFotos() {
  if (!('caches' in window) || !estado.noticias) return;
  try {
    // Foto grande só da manchete (1ª de cada aba); nas outras e nos salvos aparece só a miniatura
    const atuais = new Set(Object.values(estado.noticias.abas)
      .flatMap((a) => (a.itens || []).map((i, posicao) => (posicao === 0 ? [i.foto?.grande, i.foto?.miniatura] : [i.foto?.miniatura])))
      .flat().map(linkSeguro).filter(Boolean).map((u) => new URL(u).href));
    const cache = await caches.open(CACHE_FOTOS);
    const guardadas = new Set();
    for (const pedido of await cache.keys()) {
      if (atuais.has(pedido.url)) guardadas.add(pedido.url);
      else await cache.delete(pedido);
    }
    if (!navigator.onLine || navigator.connection?.saveData) return;
    for (const url of atuais) {
      if (!guardadas.has(url)) await cache.add(new Request(url, { mode: 'cors', referrerPolicy: 'no-referrer' })).catch(() => {});
    }
  } catch { /* sem acesso ao cache: ignora */ }
}

// ---------------------------------------------------------------------------
// Cartão de notícia
// ---------------------------------------------------------------------------
function cartaoNoticia(n, { emSalvos = false, posicao = 0 } = {}) {
  const lida = estaLida(n.id);
  const salva = estaSalva(n.id);
  const usados = new Set();
  const link = linkSeguro(n.link);
  // A 1ª notícia de cada aba é a manchete; as outras ganham número (02, 03...)
  const manchete = !emSalvos && posicao === 0;

  const semNumero = emSalvos || manchete;
  return el('article', { class: `cartao${manchete ? ' manchete' : ''}${semNumero ? ' sem-numero' : ''}${lida && !emSalvos ? ' lida' : ''}`, 'data-id': n.id, 'data-aba-cor': n.aba },
    !emSalvos && !manchete ? el('span', { class: 'cartao-numero', 'aria-hidden': 'true' }, String(posicao + 1).padStart(2, '0')) : null,
    el('div', { class: 'cartao-corpo' },
    manchete ? midia(n, 'grande', true) : null,
    manchete ? el('p', { class: 'chapeu' }, 'Destaque') : null,
    emSalvos && ABAS[n.aba] ? el('p', { class: 'chapeu' }, ABAS[n.aba].nome) : null,
    el('div', { class: 'cabeca' },
      el('div', { class: 'cabeca-texto' },
        el('p', { class: 'cartao-meta' },
          el('span', { class: 'fonte' }, n.fonte),
          n.oficial ? el('span', { class: 'selo-oficial', title: 'Fonte oficial (órgão público ou B3)' }, 'Oficial') : null,
          el('time', { datetime: n.data, title: dataCompleta(n.data) }, quando(n.data)),
        ),
        el('h3', { class: 'cartao-titulo' }, lida && !emSalvos ? el('span', { class: 'marca-lida' }, el('span', { 'aria-hidden': 'true' }, '✓ '), el('span', { class: 'sr-only' }, 'Lida: ')) : null, textoComTermos(n.titulo, usados)),
      ),
      manchete ? null : midia(n, 'miniatura'),
    ),
    n.resumo ? el('p', { class: 'cartao-resumo' }, textoComTermos(n.resumo, usados)) : null,
    n.tambemEm?.length ? el('p', { class: 'tambem-em' }, `Também em ${n.tambemEm.join(', ')}`) : null,
    emSalvos && quando(n.salvoEm) ? el('p', { class: 'tambem-em' }, `Salva ${quando(n.salvoEm)}`) : null,
    el('div', { class: 'cartao-acoes' },
      link
        ? el('a', { class: 'botao botao-principal', href: link, target: '_blank', rel: 'noopener noreferrer', 'data-acao': 'abrir' },
          'Abrir fonte', el('span', { class: 'seta', 'aria-hidden': 'true' }, '↗'))
        : null,
      emSalvos
        ? null
        : el('button', { type: 'button', class: 'botao', 'data-acao': 'lida', 'aria-pressed': String(lida) }, lida ? '✓ Lida' : 'Já li'),
      el('button', { type: 'button', class: 'botao', 'data-acao': 'salvar', 'aria-pressed': String(salva) },
        emSalvos ? 'Remover' : salva ? '★ Salva' : '☆ Salvar'),
    ),
    ), // fim de .cartao-corpo
  );
}

// ---------------------------------------------------------------------------
// Painel de números
// ---------------------------------------------------------------------------
function painelIndicadores(painelId) {
  const lista = estado.indicadores?.paineis?.[painelId];
  if (!lista?.length) return null;
  return el('section', { class: 'painel', 'aria-label': 'Números do dia' },
    el('p', { class: 'painel-titulo' }, 'Números do dia'),
    el('div', { class: 'painel-grade' }, lista.map((ind) => {
      const variacao = variacaoIndicador(ind);
      const anteriorTexto = ind.anterior
        ? `Anterior: ${valorIndicador({ ...ind, valor: ind.anterior.valor })}${ind.anterior.referencia ? ` (${ind.anterior.referencia})` : ''}`
        : '';
      return el('div', { class: `indicador${ind.desatualizado ? ' desatualizado' : ''}`, title: anteriorTexto || null },
        el('p', { class: 'indicador-nome' }, ind.nome),
        el('p', { class: 'indicador-valor' }, valorIndicador(ind)),
        variacao
          ? el('p', { class: `indicador-variacao ${COLORIR_VARIACAO.has(ind.id) ? variacao.direcao : 'neutra'}` },
            el('span', { 'aria-hidden': 'true' }, variacao.direcao === 'sobe' ? '▲ ' : variacao.direcao === 'cai' ? '▼ ' : '■ '),
            el('span', { class: 'sr-only' }, variacao.direcao === 'sobe' ? 'subiu ' : variacao.direcao === 'cai' ? 'caiu ' : 'estável '),
            variacao.texto)
          : null,
        el('p', { class: 'indicador-ref' }, [ind.referencia, ind.fonte].filter(Boolean).join(' · ')),
        ind.desatualizado ? el('p', { class: 'indicador-aviso' }, 'Não atualizado na última coleta') : null,
      );
    })),
  );
}

// ---------------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------------
function telaAba(aba) {
  const cfg = ABAS[aba];
  const itens = noticiasDaAba(aba);
  const lidas = itens.filter((n) => estaLida(n.id)).length;
  const emDia = itens.length > 0 && lidas === itens.length;

  const porcentagem = itens.length ? Math.round((lidas / itens.length) * 100) : 0;
  // Dia fraco de notícias: o robô amplia a janela de 48 para 96 horas
  const janela = estado.noticias?.abas?.[aba]?.janelaHoras || 48;
  const periodo = janela > 48 ? 'nos últimos dias' : 'hoje';
  return [
    el('div', { class: 'aba-topo' },
      el('p', { class: 'chapeu' }, itens.length ? `As ${itens.length} que importam ${periodo}` : 'Hoje'),
      el('h2', {}, cfg.nome),
      itens.length
        ? el('div', { class: 'progresso' },
          el('span', { class: 'progresso-texto' }, `${lidas} de ${itens.length} lidas`),
          el('span', { class: 'progresso-barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(itens.length), 'aria-valuenow': String(lidas), 'aria-label': 'Notícias lidas' },
            el('span', { class: 'progresso-preenchido', style: `width: ${porcentagem}%` })))
        : null,
    ),
    cfg.painel ? painelIndicadores(cfg.painel) : null,
    emDia
      ? el('div', { class: 'em-dia', role: 'status' },
        el('p', { class: 'em-dia-titulo' }, 'Você está em dia.'),
        el('p', {}, `Leu tudo o que importa em ${cfg.nome} hoje. Novas notícias chegam nas próximas horas.`))
      : null,
    itens.length
      ? el('div', { class: 'lista' }, itens.map((n, posicao) => cartaoNoticia({ ...n, aba }, { posicao })))
      : el('div', { class: 'vazio' },
        el('p', {}, `Nenhuma notícia importante nas últimas ${janela} horas.`),
        el('p', {}, 'Quando sair algo relevante, aparece aqui.')),
  ];
}

function telaSalvos() {
  const salvos = listarSalvos();
  return [
    el('div', { class: 'aba-topo' },
      el('p', { class: 'chapeu' }, 'Para ler com calma'),
      el('h2', {}, 'Salvos'),
      salvos.length ? el('p', { class: 'progresso-texto' }, `${salvos.length} ${salvos.length === 1 ? 'notícia guardada' : 'notícias guardadas'}`) : null,
    ),
    salvos.length
      ? el('div', { class: 'lista' }, salvos.map((n) => cartaoNoticia(n, { emSalvos: true })))
      : el('div', { class: 'vazio' },
        el('p', {}, 'Nenhuma notícia salva ainda.'),
        el('p', {}, 'Toque em “☆ Salvar” numa notícia para guardá-la aqui e reler com calma.')),
  ];
}

function telaErro() {
  const offline = !navigator.onLine;
  return el('div', { class: 'vazio erro', role: 'alert' },
    el('p', {}, offline ? 'Você está sem internet.' : 'Não foi possível carregar as notícias.'),
    el('p', {}, offline ? 'Conecte-se e tente de novo.' : 'Tente de novo em instantes.'),
    el('button', { type: 'button', class: 'botao botao-principal', 'data-acao': 'tentar' }, 'Tentar de novo'),
  );
}

function renderizar({ manterRolagem = false } = {}) {
  const aba = abaAtual();
  const rolagem = window.scrollY;

  let filhos;
  if (estado.carregando && !estado.noticias) filhos = [el('div', { class: 'vazio' }, el('p', {}, 'Carregando notícias…'))];
  else if (aba === 'salvos') filhos = telaSalvos();
  else if (!estado.noticias) filhos = [telaErro()];
  else filhos = telaAba(aba);
  conteudo.replaceChildren(...filhos.filter(Boolean));
  document.body.dataset.aba = aba; // define a cor da aba no CSS
  $('#data-hoje').textContent = dataDeHoje.format(new Date());

  // Barra de abas: aba ativa e quantas faltam ler
  for (const link of document.querySelectorAll('.abas a')) {
    const id = link.dataset.aba;
    if (id === aba) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    const faltam = noticiasDaAba(id).filter((n) => !estaLida(n.id)).length;
    const marcador = link.querySelector('.pendentes');
    marcador.hidden = faltam === 0;
    marcador.textContent = faltam;
    marcador.setAttribute('aria-label', `${faltam} não lidas`);
  }
  const salvosLink = $('#botao-salvos');
  if (aba === 'salvos') salvosLink.setAttribute('aria-current', 'page');
  else salvosLink.removeAttribute('aria-current');
  const qtdSalvos = listarSalvos().length;
  $('#contador-salvos').hidden = qtdSalvos === 0;
  $('#contador-salvos').textContent = qtdSalvos;

  atualizarCabecalho();
  window.scrollTo(0, manterRolagem ? rolagem : 0);
}

function atualizarCabecalho() {
  const aviso = $('#atualizado');
  aviso.classList.remove('alerta');
  if (estado.carregando && !estado.noticias) { aviso.textContent = 'Carregando…'; return; }
  if (!estado.noticias) { aviso.textContent = navigator.onLine ? 'Sem dados no momento' : 'Sem internet'; aviso.classList.add('alerta'); return; }
  const gerado = estado.noticias.geradoEm;
  const horas = (Date.now() - new Date(gerado)) / 3600000;
  // Recente: "às 20:00 (há 17 min)". Mais antigo: "hoje às 08:00", "ontem às 21:35", "12/11 às 09:00".
  const rotulo = horas < 6 ? `às ${hora(gerado)} (${quando(gerado)})` : quando(gerado);
  let texto = `Atualizado ${rotulo}`;
  if (!navigator.onLine) texto = `Sem internet · notícias atualizadas ${rotulo}`;
  else if (horas > HORAS_PARA_AVISO_DESATUALIZADO) texto += ' · pode estar desatualizado';
  if (!navigator.onLine || horas > HORAS_PARA_AVISO_DESATUALIZADO) aviso.classList.add('alerta');
  if (estado.erro && navigator.onLine) { texto += ' · falha ao atualizar agora'; aviso.classList.add('alerta'); }
  aviso.textContent = texto;
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------
async function baixar(caminho) {
  const r = await fetch(caminho, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
  return r.json();
}

let glossarioCarregado = false;
async function carregarDados() {
  estado.carregando = true;
  const botao = $('#botao-atualizar');
  botao.classList.add('girando');
  botao.setAttribute('aria-busy', 'true');
  atualizarCabecalho();
  try {
    const [noticias, indicadores, glossario] = await Promise.all([
      baixar('data/noticias.json'),
      baixar('data/indicadores.json').catch(() => null),
      glossarioCarregado ? null : baixar('glossario.json').catch(() => null),
    ]);
    if (glossario) { carregarGlossario(glossario.termos); glossarioCarregado = true; }
    estado.noticias = noticias;
    herdarLidas(Object.values(noticias.abas || {}).flatMap((a) => a.itens || []));
    estado.indicadores = indicadores ?? estado.indicadores;
    estado.erro = null;
    sincronizarFotos();
  } catch (e) {
    console.warn('Falha ao carregar dados:', e);
    estado.erro = e;
  } finally {
    estado.carregando = false;
    botao.classList.remove('girando');
    botao.removeAttribute('aria-busy');
    renderizar({ manterRolagem: true });
  }
}

// ---------------------------------------------------------------------------
// Explicador de termos (folha que sobe de baixo)
// ---------------------------------------------------------------------------
const dialogo = $('#dialogo-termo');
function abrirTermo(id) {
  const t = buscarTermo(id);
  if (!t) return;
  $('#termo-titulo').textContent = t.termo;
  $('#termo-explicacao').textContent = t.explicacao;
  $('#termo-importa').textContent = t.porQueImporta;
  dialogo.showModal();
}
$('#fechar-termo').addEventListener('click', () => dialogo.close());
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); }); // toque fora fecha

// ---------------------------------------------------------------------------
// Cliques (um ouvinte só para todos os cartões)
// ---------------------------------------------------------------------------
conteudo.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  const id = alvo.closest('[data-id]')?.dataset.id;

  if (acao === 'termo') { abrirTermo(alvo.dataset.termo); return; }
  if (acao === 'tentar') { carregarDados(); return; }
  if (!id) return;

  if (acao === 'abrir') {
    // Abrir a fonte conta como lida (o link segue normalmente numa nova aba)
    if (!estaLida(id)) { marcarLida(id); setTimeout(() => renderizar({ manterRolagem: true }), 0); }
    return;
  }
  if (acao === 'lida') marcarLida(id, !estaLida(id));
  if (acao === 'salvar') {
    const noticia = acharNoticia(id);
    if (noticia) alternarSalva(noticia);
  }
  renderizar({ manterRolagem: true });
});

$('#botao-atualizar').addEventListener('click', () => carregarDados());
window.addEventListener('hashchange', () => {
  const aba = abaAtual();
  if (ABAS[aba]) lembrarAba(aba);
  renderizar();
  conteudo.focus({ preventScroll: true }); // leitor de tela começa pela aba nova, não fica na barra de baixo
});
window.addEventListener('online', () => carregarDados());
window.addEventListener('offline', () => atualizarCabecalho());
// Ao voltar para o app depois de um tempo, atualiza o "há X min" e busca dados novos
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && estado.noticias) {
    const minutos = (Date.now() - new Date(estado.noticias.geradoEm)) / 60000;
    if (minutos > 30) carregarDados(); else atualizarCabecalho();
  }
});

// Aberto por um atalho do ícone (ex.: ./#economia): essa também vira a última aba
if (ABAS[location.hash.slice(1)]) lembrarAba(location.hash.slice(1));
renderizar();
carregarDados();

// Leitura sem internet e instalação na tela inicial (ver sw.js)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker não registrado:', e));
  });
}
