// Comando único da coleta: npm run coletar
// 1. Notícias  → app/data/noticias.json (+ cache/acervo.json)
// 2. Números   → app/data/indicadores.json
// Só termina com erro se TODAS as fontes de notícias falharem (ex.: sem internet).
import { coletarNoticias } from './noticias.js';
import { coletarIndicadores } from './indicadores.js';

const agora = new Date();
const noticias = await coletarNoticias({ agora });
const indicadores = await coletarIndicadores({ agora });

if (indicadores.falhas === indicadores.total) {
  console.warn('Aviso: nenhum indicador foi atualizado; o painel mostra os últimos valores salvos.');
}
if (noticias.falhas === noticias.total) {
  console.error('Todas as fontes de notícias falharam. Verifique a internet.');
  process.exit(1);
}
