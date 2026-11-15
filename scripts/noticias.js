// Coleta as notícias de todas as fontes e grava app/data/noticias.json
// com até 5 notícias por aba. Mantém um acervo (cache/acervo.json) com as
// notícias dos últimos dias, para que nada suma entre uma coleta e outra
// (alguns feeds só mostram as 15–20 mais recentes).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lerTodas, veiculoAceito } from './lib/feeds.js';
import { prepararTemas, classificar, montarAbas } from './lib/selecao.js';
import { adicionarFotos } from './lib/imagens.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ_FONTES = path.join(RAIZ, 'scripts', 'fontes.json');
const ARQ_TEMAS = path.join(RAIZ, 'scripts', 'temas.json');
const ARQ_ACERVO = path.join(RAIZ, 'cache', 'acervo.json');
const ARQ_IMAGENS = path.join(RAIZ, 'cache', 'imagens.json');
const ARQ_SAIDA = path.join(RAIZ, 'app', 'data', 'noticias.json');

const lerJson = (arq, padrao) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : padrao);
const idDoLink = (link) => createHash('sha1').update(link).digest('hex').slice(0, 12);
const gravarJson = (arq, dados) => {
  mkdirSync(path.dirname(arq), { recursive: true });
  writeFileSync(arq, JSON.stringify(dados, null, 2) + '\n');
};

export async function coletarNoticias({ agora = new Date() } = {}) {
  const { fontes } = lerJson(ARQ_FONTES);
  const temasBrutos = lerJson(ARQ_TEMAS);
  const temas = prepararTemas(temasBrutos);
  const fontesPorId = Object.fromEntries(fontes.map((f) => [f.id, f]));

  // 1. Ler as fontes (as que falharem ficam registradas, as outras seguem)
  const leituras = await lerTodas(fontes, agora);
  const novos = leituras.flatMap((l) => l.itens);

  // 2. Juntar com o acervo e descartar o que for mais velho que a janela estendida,
  //    de fonte que saiu do cadastro ou de veículo que não está mais na lista
  const limite = agora.getTime() - temas.janela.horasEstendida * 3600 * 1000;
  const porLink = new Map();
  for (const item of [...lerJson(ARQ_ACERVO, []), ...novos]) {
    const fonte = fontesPorId[item.fonteId];
    if (!fonte || !veiculoAceito(fonte, item.origem)) continue;
    if (new Date(item.data).getTime() >= limite) porLink.set(item.link, item);
  }
  const acervo = [...porLink.values()].sort((a, b) => new Date(b.data) - new Date(a.data));
  gravarJson(ARQ_ACERVO, acervo);

  // 3. Classificar por aba, juntar repetidas e escolher as melhores
  //    (`busca`: veio de uma busca do Google Notícias, que tem limite próprio de itens por aba)
  const comBusca = acervo.map((i) => ({ ...i, busca: fontesPorId[i.fonteId].tipo === 'googlenews' }));
  const abas = montarAbas(classificar(comBusca, fontesPorId, temas), temas, agora);

  // 3b. Foto de cada notícia escolhida (capa da página ou do feed)
  await adicionarFotos(Object.values(abas).flatMap((aba) => aba.itens), ARQ_IMAGENS, agora);

  // 4. Gravar o arquivo que o app lê
  const saida = {
    geradoEm: agora.toISOString(),
    abas: Object.fromEntries(Object.entries(abas).map(([id, aba]) => [id, {
      nome: temasBrutos.abas[id].nome,
      janelaHoras: aba.janelaHoras,
      itens: aba.itens.map((i) => ({
        id: idDoLink(i.link),
        // Outras versões da mesma história: se uma já foi lida, o app considera esta lida também
        outrosIds: (i.links || []).filter((l) => l !== i.link).map(idDoLink),
        titulo: i.titulo,
        resumo: i.resumo,
        link: i.link,
        fonte: i.fonte,
        oficial: i.categoria === 'oficial',
        categoria: i.categoria,
        data: i.data,
        tambemEm: i.tambemEm,
        foto: i.foto || null,
        pontos: i.pontos,
      })),
    }])),
    fontes: leituras.map((l) => ({ id: l.fonte.id, nome: l.fonte.nome, ok: l.ok, itens: l.itens.length, erro: l.erro })),
  };
  gravarJson(ARQ_SAIDA, saida);

  const falhas = leituras.filter((l) => !l.ok);
  console.log(`Notícias: ${novos.length} lidas de ${leituras.length - falhas.length}/${leituras.length} fontes; acervo com ${acervo.length}.`);
  for (const [id, aba] of Object.entries(saida.abas)) console.log(`  ${id.padEnd(9)} ${aba.itens.length} notícia(s) (janela ${aba.janelaHoras}h)`);
  for (const f of falhas) console.log(`  ⚠ ${f.fonte.id}: ${f.erro}`);
  return { saida, falhas: falhas.length, total: leituras.length };
}

// Rodando direto: node scripts/noticias.js
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await coletarNoticias();
}
