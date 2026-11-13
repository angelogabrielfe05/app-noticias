// Busca os números do painel e grava app/data/indicadores.json.
// Economia: Selic, IPCA 12 meses, dólar PTAX, PIB trimestral (Banco Central e IBGE, oficiais).
// Mercado: Ibovespa e IFIX (B3, oficial; reserva: Yahoo), CDI (Banco Central), S&P 500 (Yahoo Finance).
// Se uma fonte falhar, mantém o último valor salvo, marcado como desatualizado.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ_SAIDA = path.join(RAIZ, 'app', 'data', 'indicadores.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

async function baixarJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const doisDigitos = (n) => String(n).padStart(2, '0');
const paraBr = (d) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
const brParaIso = (s) => { const [d, m, a] = s.split('/'); return `${a}-${m}-${d}`; };
const numeroBr = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));

// ---------------------------------------------------------------------------
// Banco Central (SGS). Consulta por período: o atalho "últimos N" às vezes volta vazio.
// ---------------------------------------------------------------------------
async function serieBcb(codigo, dias, hoje) {
  const inicio = new Date(hoje.getTime() - dias * 86400000);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${paraBr(inicio)}&dataFinal=${paraBr(hoje)}`;
  const dados = await baixarJson(url);
  const hojeIso = hoje.toISOString().slice(0, 10);
  // Ordena por data e ignora datas futuras (a Selic vem preenchida até a próxima reunião do Copom)
  const pontos = dados
    .map((p) => ({ data: brParaIso(p.data), valor: Number(p.valor) }))
    .filter((p) => p.data <= hojeIso && !isNaN(p.valor))
    .sort((a, b) => a.data.localeCompare(b.data));
  if (pontos.length < 2) throw new Error('série com poucos dados');
  return pontos;
}

async function selic(hoje) {
  const pontos = await serieBcb(432, 400, hoje);
  const atual = pontos.at(-1);
  // Data em que a taxa atual começou a valer e valor anterior (última mudança do Copom)
  let i = pontos.length - 1;
  while (i > 0 && pontos[i - 1].valor === atual.valor) i--;
  const anterior = i > 0 ? pontos[i - 1] : null;
  return {
    valor: atual.valor, data: pontos[i].data, referencia: `desde ${pontos[i].data.split('-').reverse().join('/')}`,
    anterior: anterior && { valor: anterior.valor, data: anterior.data },
  };
}

async function ipca12m(hoje) {
  const pontos = await serieBcb(13522, 150, hoje);
  const [ant, atual] = pontos.slice(-2);
  const [a, m] = atual.data.split('-');
  return { valor: atual.valor, data: atual.data, referencia: `${MESES_CURTOS[+m - 1]}/${a}`, anterior: ant };
}

async function ultimaDiaria(codigo, hoje) {
  const pontos = await serieBcb(codigo, 30, hoje);
  const [ant, atual] = pontos.slice(-2);
  return { valor: atual.valor, data: atual.data, referencia: atual.data.split('-').reverse().join('/'), anterior: ant };
}

// ---------------------------------------------------------------------------
// IBGE (SIDRA): PIB, variação contra o trimestre anterior, com ajuste sazonal
// ---------------------------------------------------------------------------
async function pibTrimestral() {
  const dados = await baixarJson('https://apisidra.ibge.gov.br/values/t/5932/n1/all/v/6564/p/last%202/c11255/90707');
  const linhas = dados.slice(1).sort((a, b) => a.D3C.localeCompare(b.D3C));
  if (linhas.length < 1) throw new Error('sem dados do PIB');
  const atual = linhas.at(-1);
  const ant = linhas.length > 1 ? linhas.at(-2) : null;
  const trimestre = (l) => `${l.D3C.slice(-1)}º tri ${l.D3C.slice(0, 4)}`;
  return {
    valor: Number(atual.V), data: `${atual.D3C.slice(0, 4)}-${doisDigitos(+atual.D3C.slice(-1) * 3)}-01`, referencia: trimestre(atual),
    anterior: ant && { valor: Number(ant.V), referencia: trimestre(ant) },
  };
}

// ---------------------------------------------------------------------------
// B3 (oficial): fechamentos diários do ano (tabela dia × mês)
// ---------------------------------------------------------------------------
async function fechamentosB3(indice, ano) {
  const parametro = Buffer.from(JSON.stringify({ language: 'pt-br', index: indice, year: String(ano) })).toString('base64');
  const dados = await baixarJson(`https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/${parametro}`);
  const pontos = [];
  for (const linha of dados.results || []) {
    for (let mes = 1; mes <= 12; mes++) {
      const v = linha[`rateValue${mes}`];
      if (v) pontos.push({ data: `${ano}-${doisDigitos(mes)}-${doisDigitos(linha.day)}`, valor: numeroBr(v) });
    }
  }
  return pontos.sort((a, b) => a.data.localeCompare(b.data));
}

async function indiceB3(indice, hoje) {
  let pontos = await fechamentosB3(indice, hoje.getFullYear());
  if (pontos.length < 2) pontos = [...(await fechamentosB3(indice, hoje.getFullYear() - 1)), ...pontos];
  if (pontos.length < 2) throw new Error('B3 sem dados');
  const [ant, atual] = pontos.slice(-2);
  return { valor: atual.valor, data: atual.data, referencia: atual.data.split('-').reverse().join('/'), anterior: ant };
}

// ---------------------------------------------------------------------------
// Yahoo Finance (não oficial): últimos fechamentos diários
// ---------------------------------------------------------------------------
async function indiceYahoo(simbolo) {
  const dados = await baixarJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1mo&interval=1d`);
  const r = dados.chart?.result?.[0];
  if (!r) throw new Error('Yahoo sem dados');
  const fechamentos = r.indicators.quote[0].close;
  const pontos = r.timestamp
    .map((t, i) => ({ data: new Date((t + (r.meta.gmtoffset || 0)) * 1000).toISOString().slice(0, 10), valor: fechamentos[i] }))
    .filter((p) => p.valor != null)
    .map((p) => ({ ...p, valor: Math.round(p.valor * 100) / 100 }));
  if (pontos.length < 2) throw new Error('Yahoo com poucos dados');
  const [ant, atual] = pontos.slice(-2);
  return { valor: atual.valor, data: atual.data, referencia: atual.data.split('-').reverse().join('/'), anterior: ant };
}

/** Tenta as fontes em ordem; devolve o resultado da primeira que funcionar. */
async function primeiraQueFunciona(tentativas) {
  const erros = [];
  for (const [fonte, buscar] of tentativas) {
    try { return { ...(await buscar()), fonte }; } catch (e) { erros.push(`${fonte}: ${e.name === 'TimeoutError' ? 'tempo esgotado' : e.message}`); }
  }
  throw new Error(erros.join('; '));
}

// ---------------------------------------------------------------------------
// Definição do painel
// ---------------------------------------------------------------------------
function definicoes(hoje) {
  return {
    economia: [
      { id: 'selic', nome: 'Selic', unidade: '% a.a.', formato: 'percentual', variacao: 'pontos', tentativas: [['Banco Central', () => selic(hoje)]] },
      { id: 'ipca12m', nome: 'IPCA 12 meses', unidade: '%', formato: 'percentual', variacao: 'pontos', tentativas: [['Banco Central', () => ipca12m(hoje)]] },
      { id: 'dolar', nome: 'Dólar (PTAX)', unidade: 'R$', formato: 'moeda', variacao: 'percentual', tentativas: [['Banco Central', () => ultimaDiaria(1, hoje)]] },
      { id: 'pib', nome: 'PIB no trimestre', unidade: '%', formato: 'percentual', variacao: 'pontos', tentativas: [['IBGE', () => pibTrimestral()]] },
    ],
    mercado: [
      { id: 'ibovespa', nome: 'Ibovespa', unidade: 'pts', formato: 'pontos', variacao: 'percentual', tentativas: [['B3', () => indiceB3('IBOV', hoje)], ['Yahoo Finance', () => indiceYahoo('^BVSP')]] },
      { id: 'cdi', nome: 'CDI', unidade: '% a.a.', formato: 'percentual', variacao: 'pontos', tentativas: [['Banco Central', () => ultimaDiaria(4389, hoje)]] },
      { id: 'ifix', nome: 'IFIX', unidade: 'pts', formato: 'pontos', variacao: 'percentual', tentativas: [['B3', () => indiceB3('IFIX', hoje)], ['Yahoo Finance', () => indiceYahoo('IFIX.SA')]] },
      { id: 'sp500', nome: 'S&P 500', unidade: 'pts', formato: 'pontos', variacao: 'percentual', tentativas: [['Yahoo Finance', () => indiceYahoo('^GSPC')]] },
    ],
  };
}

export async function coletarIndicadores({ agora = new Date() } = {}) {
  const anteriores = existsSync(ARQ_SAIDA) ? JSON.parse(readFileSync(ARQ_SAIDA, 'utf8')) : null;
  const paineis = {};
  let falhas = 0;
  let total = 0;
  for (const [painel, lista] of Object.entries(definicoes(agora))) {
    paineis[painel] = await Promise.all(lista.map(async ({ tentativas, ...def }) => {
      total++;
      try {
        return { ...def, ...(await primeiraQueFunciona(tentativas)), atualizadoEm: agora.toISOString(), desatualizado: false };
      } catch (e) {
        falhas++;
        console.log(`  ⚠ ${def.id}: ${e.message}`);
        const velho = anteriores?.paineis?.[painel]?.find((x) => x.id === def.id);
        return velho ? { ...velho, desatualizado: true } : { ...def, valor: null, desatualizado: true };
      }
    }));
  }
  const saida = { geradoEm: agora.toISOString(), paineis };
  mkdirSync(path.dirname(ARQ_SAIDA), { recursive: true });
  writeFileSync(ARQ_SAIDA, JSON.stringify(saida, null, 2) + '\n');
  console.log(`Indicadores: ${total - falhas}/${total} atualizados.`);
  for (const [painel, lista] of Object.entries(paineis)) {
    console.log(`  ${painel.padEnd(9)} ${lista.map((i) => `${i.nome}=${i.valor ?? '—'}${i.desatualizado ? '*' : ''} (${i.referencia ?? '?'}, ${i.fonte ?? '?'})`).join(' | ')}`);
  }
  return { saida, falhas, total };
}

// Rodando direto: node scripts/indicadores.js
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await coletarIndicadores();
}
