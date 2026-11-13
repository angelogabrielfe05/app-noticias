// Números e datas no padrão brasileiro, sempre no horário de Brasília.

const FUSO = 'America/Sao_Paulo';
const horaMin = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
const diaMes = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
const diaChave = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
const completo = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'full', timeStyle: 'short' });

/** "há 25 min", "há 3 h", "ontem às 14:30", "12/11 às 09:00" */
export function quando(iso, agora = new Date()) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const min = Math.round((agora - d) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 6 * 60) return `há ${Math.floor(min / 60)} h`;
  const hoje = diaChave.format(agora);
  const ontem = diaChave.format(new Date(agora.getTime() - 86400000));
  const dia = diaChave.format(d);
  if (dia === hoje) return `hoje às ${horaMin.format(d)}`;
  if (dia === ontem) return `ontem às ${horaMin.format(d)}`;
  return `${diaMes.format(d)} às ${horaMin.format(d)}`;
}

/** Data e hora por extenso (para o "title" ao passar o dedo/mouse) */
export const dataCompleta = (iso) => (isNaN(new Date(iso)) ? '' : completo.format(new Date(iso)));
export const hora = (iso) => horaMin.format(new Date(iso));

const numero = (v, casas) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Valor principal de um indicador: "13,75%", "R$ 5,65", "172.458" */
export function valorIndicador(ind) {
  if (ind.valor == null) return '—';
  if (ind.formato === 'percentual') return `${numero(ind.valor, 2)}%`;
  if (ind.formato === 'moeda') return `R$ ${numero(ind.valor, 2)}`;
  if (ind.formato === 'pontos') return numero(ind.valor, 0);
  return String(ind.valor);
}

/**
 * Variação em relação ao valor anterior.
 * Percentual: "+0,66%" (índices, dólar). Pontos: "−0,25 p.p." (taxas).
 * Devolve { texto, direcao: 'sobe' | 'cai' | 'igual' } ou null.
 */
export function variacaoIndicador(ind) {
  const ant = ind.anterior?.valor;
  if (ind.valor == null || ant == null) return null;
  const diferenca = ind.valor - ant;
  const direcao = Math.abs(diferenca) < 1e-9 ? 'igual' : diferenca > 0 ? 'sobe' : 'cai';
  const sinal = diferenca > 0 ? '+' : diferenca < 0 ? '−' : '';
  let texto;
  if (ind.variacao === 'percentual') {
    texto = `${sinal}${numero(Math.abs((diferenca / ant) * 100), 2)}%`;
  } else {
    texto = `${sinal}${numero(Math.abs(diferenca), 2)} p.p.`;
  }
  return { texto, direcao };
}
