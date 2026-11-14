// Baixa e lê os feeds (RSS, Atom e a API de notícias do IBGE),
// devolvendo uma lista de notícias no mesmo formato para todas as fontes.
// Se uma fonte falhar, ela é registrada como erro e as outras continuam.
import { XMLParser } from 'fast-xml-parser';

const USER_AGENT = 'Mozilla/5.0 (compatible; NEWs/0.1; leitor de RSS pessoal; +https://github.com/angelogabrielfe05/app-noticias)';
const TEMPO_LIMITE_MS = 20000;
const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
  isArray: (nome) => ['item', 'entry', 'link', 'category'].includes(nome),
});

/** Troca {ano}/{mes} pelo mês atual e pelo anterior (o feed do mês novo pode ainda estar vazio). */
export function expandirUrl(url, agora = new Date()) {
  if (!url.includes('{ano}')) return [url];
  const datas = [agora, new Date(agora.getFullYear(), agora.getMonth() - 1, 15)];
  return datas.map((d) => url.replace('{ano}', d.getFullYear()).replace('{mes}', MESES[d.getMonth()]));
}

/** Baixa uma URL respeitando a codificação declarada (algumas fontes usam ISO-8859-1). */
async function baixar(url) {
  const resposta = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.8' },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    redirect: 'follow',
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  const inicio = new TextDecoder('latin1').decode(bytes.slice(0, 300));
  const declarada = inicio.match(/encoding=["']([\w-]+)["']/i)?.[1];
  const doCabecalho = resposta.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1];
  let codificacao = (declarada || doCabecalho || 'utf-8').toLowerCase();
  try { return new TextDecoder(codificacao).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); }
}

/** Texto puro: tira tags HTML, decodifica entidades que sobraram e junta espaços. */
export function limparTexto(valor) {
  if (valor == null) return '';
  let t = typeof valor === 'object' ? (valor['#text'] ?? '') : String(valor);
  t = t
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return t.replace(/\s+/g, ' ').trim();
}

/** Corta o resumo num tamanho bom para o cartão, sem partir palavra no meio. */
function encurtar(texto, max = 320) {
  if (texto.length <= max) return texto;
  return texto.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function lerData(...candidatos) {
  for (const c of candidatos) {
    const texto = limparTexto(c);
    if (!texto) continue;
    const d = new Date(texto);
    if (!isNaN(d)) return d;
  }
  return null;
}

function lerLink(item) {
  const links = item.link || [];
  for (const l of links) {
    if (typeof l === 'string' && l.trim()) return l.trim();
    if (l && typeof l === 'object') {
      if (l['@_href'] && (!l['@_rel'] || l['@_rel'] === 'alternate')) return l['@_href'];
      if (l['#text']) return String(l['#text']).trim();
    }
  }
  const guid = limparTexto(item.guid);
  return /^https?:\/\//.test(guid) ? guid : '';
}

function lerXml(texto) {
  const xml = parser.parse(texto);
  const itens = xml.rss?.channel?.item || xml.feed?.entry || xml['rdf:RDF']?.item || [];
  return itens.map((item) => ({
    titulo: limparTexto(item.title),
    link: lerLink(item),
    resumo: encurtar(limparTexto(item.description ?? item.summary ?? item.content ?? item['content:encoded'])),
    data: lerData(item.pubDate, item.published, item.updated, item['dc:date']),
    origem: limparTexto(item.source),
    imagemFeed: imagemDoItem(item),
  }));
}

/**
 * Foto que vem dentro do próprio feed (plano B: a foto de capa da página é preferida).
 * Procura em media:content, media:thumbnail, enclosure e na 1ª <img> do texto.
 */
function imagemDoItem(item) {
  const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const candidatos = [
    ...lista(item['media:content']).filter((m) => !m['@_medium'] || m['@_medium'] === 'image').map((m) => m['@_url']),
    ...lista(item['media:group']).flatMap((g) => lista(g['media:content']).map((m) => m['@_url'])),
    ...lista(item['media:thumbnail']).map((m) => m['@_url']),
    ...lista(item.enclosure).filter((e) => String(e['@_type'] || '').startsWith('image')).map((e) => e['@_url']),
  ];
  for (const campo of [item['content:encoded'], item.description, item.content]) {
    const html = typeof campo === 'object' ? campo?.['#text'] : campo;
    const src = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    if (src) candidatos.push(src);
  }
  return candidatos.find((u) => typeof u === 'string' && /^https:\/\//i.test(u) && !pareceLogo(u)) || null;
}

/** Logotipos, ícones e imagens-padrão não servem como foto da notícia. */
export function pareceLogo(url) {
  return /logo|icon|favicon|sprite|placeholder|avatar|default[-_.]|blank\.|pixel|\.svg(\?|$)|\.gif(\?|$)/i.test(url);
}

function lerIbge(texto) {
  const json = JSON.parse(texto);
  return (json.items || []).map((i) => {
    // Formato do IBGE: "12/11/2026 09:00:00", no horário de Brasília
    const [d, m, a, h, min, s] = (i.data_publicacao || '').split(/[/: ]/);
    const data = a ? new Date(`${a}-${m}-${d}T${h}:${min}:${s}-03:00`) : null;
    return {
      titulo: limparTexto(i.titulo),
      link: (i.link || '').replace(/^http:/, 'https:'),
      resumo: encurtar(limparTexto(i.introducao)),
      data: data && !isNaN(data) ? data : null,
    };
  });
}

/**
 * Lista de veículos confiáveis das buscas do Google Notícias
 * (ignora maiúsculas e o sufixo depois de " - ", ex.: "Investing.com Brasil - Finanças...").
 */
export function veiculoAceito(fonte, origem) {
  if (!fonte.veiculos?.length) return true;
  const nome = (origem || '').split(' - ')[0].trim().toLowerCase();
  return fonte.veiculos.some((v) => v.toLowerCase() === nome);
}

/**
 * Google Notícias: o título vem como "Título - Veículo" e o resumo é só uma lista de links.
 * Tira o nome do veículo do título e deixa o resumo vazio.
 */
function ajustarGoogleNews(item) {
  let titulo = item.titulo;
  if (item.origem && titulo.endsWith(' - ' + item.origem)) titulo = titulo.slice(0, -(item.origem.length + 3));
  return { ...item, titulo: titulo.trim(), resumo: '' };
}

/** Lê uma fonte e devolve { ok, itens, erro }. Nunca lança erro. */
export async function lerFonte(fonte, agora = new Date()) {
  const itens = [];
  const erros = [];
  for (const url of expandirUrl(fonte.url, agora)) {
    try {
      // Uma segunda tentativa antes de desistir (falhas de rede passageiras são comuns)
      const texto = await baixar(url).catch(() => baixar(url));
      let lidos = fonte.tipo === 'ibge' ? lerIbge(texto) : lerXml(texto);
      if (fonte.tipo === 'googlenews') {
        lidos = lidos.map(ajustarGoogleNews);
        lidos = lidos.filter((i) => veiculoAceito(fonte, i.origem));
      }
      itens.push(...lidos);
    } catch (e) {
      const motivo = e.cause?.code || e.cause?.message;
      erros.push(`${e.name === 'TimeoutError' ? 'tempo esgotado' : e.message}${motivo ? ` (${motivo})` : ''}`);
    }
  }
  const validos = itens
    .filter((i) => i.titulo && /^https?:\/\//.test(i.link) && i.data)
    .map((i) => ({
      ...i,
      data: i.data.toISOString(),
      origem: i.origem || undefined,
      fonteId: fonte.id,
      // Busca do Google Notícias: mostra o veículo de verdade (ex.: Exame), não o Google
      fonte: fonte.nome === '{veiculo}' ? (i.origem || 'Google Notícias') : fonte.nome,
      categoria: fonte.categoria,
    }));
  // Para fontes com {ano}/{mes}, basta um dos meses funcionar
  const ok = validos.length > 0 || erros.length < expandirUrl(fonte.url, agora).length;
  return { ok, itens: validos, erro: ok ? null : erros.join('; ') };
}

/** Lê todas as fontes em paralelo. */
export async function lerTodas(fontes, agora = new Date()) {
  const resultados = await Promise.all(fontes.map((f) => lerFonte(f, agora)));
  return fontes.map((f, i) => ({ fonte: f, ...resultados[i] }));
}
