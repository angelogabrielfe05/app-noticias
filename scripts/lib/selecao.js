// Escolhe o que importa: classifica cada notícia na aba certa (palavras-chave),
// filtra por data, junta repetidas e fica com as melhores de cada aba.

/** Minúsculas, sem acentos, só letras/números separados por espaço. */
export function normalizar(texto) {
  return ` ${String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function escaparRegex(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prepara a lista de palavras uma vez só (normaliza e cria as regex sensíveis a maiúsculas). */
function prepararPalavras(mapa) {
  return Object.entries(mapa || {}).map(([palavra, peso]) => {
    if (palavra.startsWith('=')) {
      return { peso, exata: new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(palavra.slice(1))}($|[^\\p{L}\\p{N}])`, 'u') };
    }
    return { peso, termo: normalizar(palavra) };
  });
}

export function prepararTemas(temas) {
  const gerais = prepararPalavras(temas.negativasGerais);
  const abas = {};
  for (const [id, aba] of Object.entries(temas.abas)) {
    abas[id] = { ...aba, lista: [...prepararPalavras(aba.palavras), ...prepararPalavras(aba.negativas), ...gerais] };
  }
  return { ...temas, abas };
}

/** Soma os pesos das palavras encontradas. Título vale o dobro; cada palavra conta uma vez. */
export function pontuar(item, lista) {
  const tituloN = normalizar(item.titulo);
  const resumoN = normalizar(item.resumo);
  let positivos = 0;
  let negativos = 0;
  const encontradas = [];
  for (const p of lista) {
    let noTitulo, noResumo;
    if (p.exata) {
      noTitulo = p.exata.test(item.titulo);
      noResumo = p.exata.test(item.resumo);
    } else {
      noTitulo = tituloN.includes(p.termo);
      noResumo = resumoN.includes(p.termo);
    }
    if (noTitulo || noResumo) {
      const valor = p.peso * (noTitulo ? 2 : 1);
      if (valor > 0) positivos += valor; else negativos += valor;
      encontradas.push(p.termo?.trim() || p.exata.source.replace(/\(.*?\)/g, ''));
    }
  }
  // Teto de 20 só para os pontos positivos: as penalidades sempre descontam
  return { total: positivos + negativos, pontosTema: Math.min(positivos, 20) + negativos, encontradas };
}

/**
 * Para cada notícia, calcula a pontuação em cada aba permitida pela fonte e escolhe a melhor.
 * Devolve só as notícias que passaram no filtro, com { aba, pontosTema, palavras }.
 */
export function classificar(itens, fontesPorId, temasPreparados) {
  const resultado = [];
  for (const item of itens) {
    const fonte = fontesPorId[item.fonteId];
    if (!fonte) continue;
    let melhor = null;
    for (const abaId of fonte.abas) {
      const aba = temasPreparados.abas[abaId];
      if (!aba) continue;
      const { total, pontosTema, encontradas } = pontuar(item, aba.lista);
      const minimo = fonte.filtrar === false ? temasPreparados.pontuacaoMinimaTemaFixo : temasPreparados.pontuacaoMinima;
      const passa = total >= minimo;
      if (passa && (!melhor || pontosTema > melhor.pontosTema)) {
        melhor = { aba: abaId, pontosTema, palavras: encontradas };
      }
    }
    if (melhor) resultado.push({ ...item, ...melhor });
  }
  return resultado;
}

/** Mantém só as notícias dentro da janela de horas (ignora datas no futuro). */
export function filtrarPorData(itens, horas, agora = new Date()) {
  const limite = agora.getTime() - horas * 3600 * 1000;
  const futuro = agora.getTime() + 3600 * 1000;
  return itens.filter((i) => {
    const t = new Date(i.data).getTime();
    return t >= limite && t <= futuro;
  });
}

// ---------------------------------------------------------------------------
// Repetidas, pontuação final e escolha das melhores
// ---------------------------------------------------------------------------

const PALAVRAS_VAZIAS = new Set(('a o as os de da do das dos e em no na nos nas um uma uns umas por para com sem ' +
  'que se sua seu suas seus ao aos mais menos ate apos sobre entre como diz dizem the of to and in for on with is ' +
  'r bi mi tri mil').split(' '));

function palavrasDe(texto) {
  return new Set(normalizar(texto).trim().split(' ').filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p)));
}

/** Palavras que identificam a história: as do título e as do título + resumo. */
function assinatura(item) {
  return { titulo: palavrasDe(item.titulo), texto: palavrasDe(item.titulo + ' ' + item.resumo) };
}

function emComum(a, b) {
  let n = 0;
  for (const p of a) if (b.has(p)) n++;
  return n;
}

function parecidas(a, b) {
  // 1) Títulos: 3+ palavras em comum e metade do título mais curto,
  //    ou (títulos curtos) 2+ palavras em comum e 60% do título mais curto
  const comumT = emComum(a.titulo, b.titulo);
  const menorT = Math.min(a.titulo.size, b.titulo.size);
  if (menorT && ((comumT >= 3 && comumT / menorT >= 0.5) || (comumT >= 2 && comumT / menorT >= 0.6))) return true;
  // 2) Título + resumo: muitas palavras em comum (mesmo assunto contado com outras palavras)
  const comumX = emComum(a.texto, b.texto);
  const menorX = Math.min(a.texto.size, b.texto.size);
  return menorX >= 8 && comumX >= 8 && comumX / menorX >= 0.35;
}

const BONUS_CATEGORIA = { oficial: 6, empresa: 3, imprensa: 0 };
const PRIORIDADE_CATEGORIA = { oficial: 2, empresa: 1, imprensa: 0 };

function bonusRecencia(data, agora) {
  const horas = (agora - new Date(data)) / 3600000;
  if (horas <= 6) return 4;
  if (horas <= 12) return 3;
  if (horas <= 24) return 2;
  return 0;
}

/**
 * Junta notícias repetidas (mesmo link ou títulos muito parecidos) dentro de uma aba.
 * Cada grupo vira uma notícia só: a de fonte mais oficial (e, empatando, a mais relevante).
 */
export function agruparRepetidas(itens) {
  const grupos = [];
  for (const item of itens) {
    const sig = assinatura(item);
    const grupo = grupos.find((g) => g.links.has(item.link) || g.assinaturas.some((s) => parecidas(s, sig)));
    if (grupo) {
      grupo.itens.push(item);
      grupo.links.add(item.link);
      grupo.assinaturas.push(sig);
    } else {
      grupos.push({ itens: [item], links: new Set([item.link]), assinaturas: [sig] });
    }
  }
  return grupos.map((g) => {
    const ordenados = [...g.itens].sort((a, b) =>
      (PRIORIDADE_CATEGORIA[b.categoria] - PRIORIDADE_CATEGORIA[a.categoria]) || (b.pontosTema - a.pontosTema) || (new Date(b.data) - new Date(a.data)));
    const principal = ordenados[0];
    const outrasFontes = [...new Set(ordenados.map((i) => i.fonte))].filter((f) => f !== principal.fonte);
    return { ...principal, tambemEm: outrasFontes, pontosTema: Math.max(...g.itens.map((i) => i.pontosTema)), assinaturas: g.assinaturas, links: [...g.links] };
  });
}

/** Pontuação final = tema (positivos até 20, menos penalidades) + fonte oficial + recência + cobertura (outras fontes contando a mesma história). */
export function pontuacaoFinal(item, agora = new Date()) {
  return item.pontosTema
    + (BONUS_CATEGORIA[item.categoria] ?? 0)
    + bonusRecencia(item.data, agora)
    + Math.min(item.tambemEm.length * 2, 6);
}

/**
 * Monta todas as abas de uma vez:
 * 1. para cada aba, janela de 48h (ou 96h se vierem poucas) e junta as repetidas;
 * 2. escolhe as melhores de todas as abas juntas, da maior pontuação para a menor,
 *    respeitando o máximo por aba e por fonte, e sem repetir a mesma história em duas abas.
 */
export function montarAbas(classificadas, temas, agora = new Date()) {
  const resumo = {};
  const todas = [];
  for (const abaId of Object.keys(temas.abas)) {
    const daAba = classificadas.filter((i) => i.aba === abaId);
    let janela = temas.janela.horas;
    let candidatas = agruparRepetidas(filtrarPorData(daAba, janela, agora));
    if (candidatas.length < temas.janela.minimoItens) {
      janela = temas.janela.horasEstendida;
      candidatas = agruparRepetidas(filtrarPorData(daAba, janela, agora));
    }
    resumo[abaId] = { janelaHoras: janela, candidatas: candidatas.length, itens: [] };
    for (const c of candidatas) todas.push({ ...c, pontos: pontuacaoFinal(c, agora) });
  }
  todas.sort((a, b) => (b.pontos - a.pontos) || (new Date(b.data) - new Date(a.data)));
  const escolhidas = [];
  const porFonte = {};
  for (const item of todas) {
    const aba = resumo[item.aba];
    if (aba.itens.length >= temas.maxPorAba) continue;
    if (item.pontos < (temas.pontuacaoMinimaExibir ?? 0)) continue;
    const chaveFonte = item.aba + '|' + item.fonte;
    if ((porFonte[chaveFonte] || 0) >= temas.maxPorFonte) continue;
    // Buscas do Google Notícias trazem vários veículos com nomes diferentes: o limite vale para a busca inteira
    const chaveBusca = item.busca ? item.aba + '|busca|' + item.fonteId : null;
    if (chaveBusca && (porFonte[chaveBusca] || 0) >= (temas.maxPorBusca ?? 1)) continue;
    if (chaveBusca) porFonte[chaveBusca] = (porFonte[chaveBusca] || 0) + 1;
    // Mesma história já escolhida em outra aba? Compara todas as versões de cada grupo.
    if (escolhidas.some((e) => e.links.some((l) => item.links.includes(l))
      || e.assinaturas.some((a) => item.assinaturas.some((b) => parecidas(a, b))))) continue;
    porFonte[chaveFonte] = (porFonte[chaveFonte] || 0) + 1;
    escolhidas.push(item);
    aba.itens.push(item);
  }

  // Garantir: se a aba pede (ex.: IA → Claude/Anthropic) e nenhuma escolhida cita o assunto,
  // a melhor candidata que cita entra no lugar da última.
  for (const [abaId, cfg] of Object.entries(temas.abas)) {
    if (!cfg.garantir?.length) continue;
    const termos = cfg.garantir.map(normalizar);
    const cita = (i) => termos.some((t) => normalizar(i.titulo + ' ' + i.resumo).includes(t));
    const aba = resumo[abaId];
    if (aba.itens.some(cita)) continue;
    const reserva = todas.find((i) => i.aba === abaId && cita(i)
      && i.pontos >= (temas.pontuacaoMinimaExibir ?? 0)
      && !escolhidas.some((e) => e.links.some((l) => i.links.includes(l))
        || e.assinaturas.some((a) => i.assinaturas.some((b) => parecidas(a, b)))));
    if (!reserva) continue;
    if (aba.itens.length >= temas.maxPorAba) aba.itens.pop();
    aba.itens.push(reserva);
    aba.itens.sort((a, b) => b.pontos - a.pontos);
  }

  // Tira os campos internos antes de devolver
  for (const aba of Object.values(resumo)) {
    // `links` fica: são todas as versões da história (o app usa para não "desmarcar" uma lida que trocou de link)
    aba.itens = aba.itens.map(({ assinaturas: _a, ...limpo }) => limpo);
  }
  return resumo;
}
