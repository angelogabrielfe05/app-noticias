// Service worker do NEWs: faz o app abrir rápido e funcionar sem internet.
// - Partes fixas (telas, estilo, ícones, glossário): responde com a cópia guardada e
//   renova a cópia em segundo plano ("stale-while-revalidate"). Atualizações aparecem na próxima abertura.
// - Dados (notícias e números): tenta a internet primeiro; sem conexão, usa a última cópia ("network-first").
// Ao mudar a lista de arquivos fixos, aumente VERSAO para limpar o cache antigo.
const VERSAO = 'v3';
const CACHE_APP = `news-app-${VERSAO}`;
const CACHE_DADOS = 'news-dados';
const CACHE_FOTOS = 'news-fotos'; // fotos reduzidas (wsrv.nl); o app.js apaga as que não são da edição atual

const ARQUIVOS_APP = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'lib/armazenamento.js',
  'lib/formatar.js',
  'lib/termos.js',
  'glossario.json',
  'manifest.json',
  'icones/icone.svg',
  'icones/favicon-32.png',
  'icones/icone-192.png',
  'icones/apple-touch-icon.png',
  'fontes/newsreader.woff2',
  'fontes/newsreader-italico.woff2',
  'fontes/inter.woff2',
];
const ARQUIVOS_DADOS = ['data/noticias.json', 'data/indicadores.json'];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const app = await caches.open(CACHE_APP);
    await app.addAll(ARQUIVOS_APP);
    // Dados: se falhar (ex.: instalou sem internet), não impede a instalação
    const dados = await caches.open(CACHE_DADOS);
    await Promise.allSettled(ARQUIVOS_DADOS.map((u) => dados.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith('news-app-') && nome !== CACHE_APP) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

async function primeiroInternet(pedido) {
  const cache = await caches.open(CACHE_DADOS);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) await cache.put(pedido.url.split('?')[0], resposta.clone());
    return resposta;
  } catch (erro) {
    const guardada = await cache.match(pedido.url.split('?')[0]);
    if (guardada) return guardada;
    throw erro;
  }
}

async function guardadaERenova(evento, pedido) {
  const cache = await caches.open(CACHE_APP);
  // Páginas (navegação) sempre usam o index.html guardado, com ou sem ?algo#aba no endereço
  const chave = pedido.mode === 'navigate' ? new URL('index.html', self.registration.scope).href : pedido;
  const guardada = await cache.match(chave, { ignoreSearch: true });
  const renovar = fetch(pedido)
    .then((resposta) => {
      if (resposta.ok) return cache.put(chave, resposta.clone()).then(() => resposta);
      return resposta;
    })
    .catch(() => null);
  if (guardada) {
    evento.waitUntil(renovar); // renova em segundo plano
    return guardada;
  }
  const nova = await renovar;
  return nova || Response.error();
}

/** Fotos: usa a cópia guardada; se não houver, baixa e guarda (para ler sem internet). */
async function fotoGuardada(pedido) {
  const cache = await caches.open(CACHE_FOTOS);
  const guardada = await cache.match(pedido);
  if (guardada) return guardada;
  const resposta = await fetch(pedido);
  if (resposta.ok) await cache.put(pedido, resposta.clone());
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method === 'GET' && url.hostname === 'wsrv.nl') {
    evento.respondWith(fotoGuardada(pedido));
    return;
  }
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return; // links externos seguem normais
  if (url.pathname.includes('/data/')) {
    evento.respondWith(primeiroInternet(pedido));
  } else {
    evento.respondWith(guardadaERenova(evento, pedido));
  }
});
