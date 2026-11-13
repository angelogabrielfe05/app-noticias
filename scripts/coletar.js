// Comando único da coleta: npm run coletar
// (os indicadores do painel entram aqui na tarefa 3)
import { coletarNoticias } from './noticias.js';

const noticias = await coletarNoticias();
if (noticias.falhas === noticias.total) {
  console.error('Todas as fontes de notícias falharam. Verifique a internet.');
  process.exit(1);
}
