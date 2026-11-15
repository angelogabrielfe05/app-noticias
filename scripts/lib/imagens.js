// Fotos das notícias escolhidas.
// Para cada notícia: 1) foto de capa da página (og:image / twitter:image, a mesma do WhatsApp);
// 2) se não houver, a foto que veio no feed. Descarta logotipos e confere se o endereço é mesmo uma imagem.
// Guarda o resultado em cache/imagens.json para não visitar a mesma página a cada coleta.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pareceLogo } from './feeds.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DIAS_NA_MEMORIA = 7;
const TAMANHO_MINIMO_BYTES = 8000; // menor que isso costuma ser ícone

// Fotos reduzidas pelo wsrv.nl (serviço gratuito e de código aberto): 5 MB viram ~90 KB em WebP,
// com corte inteligente (a=attention) e liberação de CORS (permite guardar para ler sem internet).
export function urlsDaFoto(original) {
  const base = `https://wsrv.nl/?url=${encodeURIComponent(original)}&fit=cover&a=attention&output=webp`;
  return { grande: `${base}&w=800&h=450&q=72`, miniatura: `${base}&w=192&h=192&q=70` };
}

/** Pede as versões reduzidas uma vez, para já estarem prontas quando o app abrir. */
async function preAquecer(foto) {
  await Promise.all([foto.grande, foto.miniatura].map(async (u) => {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(30000) }); await r.arrayBuffer(); } catch { /* o app tenta de novo */ }
  }));
}

const decodificar = (u) => u.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/').trim();

/** Procura a foto de capa no HTML da página (só o começo da página é suficiente). */
async function fotoDeCapa(link) {
  // Links do Google Notícias são só redirecionamentos (não têm a capa da matéria)
  if (/news\.google\.com/i.test(link)) return null;
  const r = await fetch(link, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!r.ok) return null;
  const html = (await r.text()).slice(0, 400000);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  for (const nome of ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) {
    for (const meta of metas) {
      const chave = meta.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      const valor = meta.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
      if (chave === nome && valor) return new URL(decodificar(valor), r.url).href;
    }
  }
  return null;
}

/** Confere se o endereço responde com uma imagem de verdade (e não é minúscula). */
async function eImagem(url) {
  if (!/^https:\/\//i.test(url) || pareceLogo(url)) return false;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' }, redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const tipo = r.headers.get('content-type') || '';
    const tamanho = Number(r.headers.get('content-length') || 0);
    r.body?.cancel().catch(() => {}); // não precisa baixar a imagem inteira
    if (!r.ok || !tipo.startsWith('image/') || tipo.includes('svg')) return false;
    return !tamanho || tamanho >= TAMANHO_MINIMO_BYTES;
  } catch {
    return false;
  }
}

async function acharFoto(item) {
  let capa = null;
  try { capa = await fotoDeCapa(item.link); } catch { /* página fora do ar: tenta o feed */ }
  for (const candidato of [capa, item.imagemFeed]) {
    if (candidato && (await eImagem(candidato))) return candidato;
  }
  return null;
}

/**
 * Coloca `foto` ({ grande, miniatura } ou null) em cada notícia escolhida.
 * `arquivoMemoria`: onde guardar o que já foi verificado.
 */
export async function adicionarFotos(itens, arquivoMemoria, agora = new Date()) {
  let memoria = {};
  try { if (existsSync(arquivoMemoria)) memoria = JSON.parse(readFileSync(arquivoMemoria, 'utf8')); } catch { /* memória ilegível: recomeça */ }
  const limite = agora.getTime() - DIAS_NA_MEMORIA * 86400000;
  for (const [link, registro] of Object.entries(memoria)) if (new Date(registro.em).getTime() < limite) delete memoria[link];

  let novas = 0;
  await Promise.all(itens.map(async (item) => {
    const nova = !(item.link in memoria);
    if (nova) {
      memoria[item.link] = { imagem: await acharFoto(item), em: agora.toISOString() };
      novas++;
    }
    const original = memoria[item.link].imagem;
    item.foto = original ? urlsDaFoto(original) : null;
    if (nova && item.foto) await preAquecer(item.foto);
  }));

  mkdirSync(path.dirname(arquivoMemoria), { recursive: true });
  writeFileSync(arquivoMemoria, JSON.stringify(memoria, null, 2) + '\n');
  const comFoto = itens.filter((i) => i.foto).length;
  console.log(`Fotos: ${comFoto}/${itens.length} notícias com foto (${novas} verificadas agora).`);
}
