// Guarda no celular (localStorage) o que é do usuário: notícias lidas, salvas e a última aba.
// Tudo protegido com try/catch: em aba anônima ou com o armazenamento bloqueado,
// o app continua funcionando (só não lembra entre uma visita e outra).

const CHAVES = { lidas: 'news.lidas', salvos: 'news.salvos', aba: 'news.aba' };
const DIAS_PARA_ESQUECER_LIDAS = 14;

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor == null ? padrao : JSON.parse(valor);
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível: segue sem gravar */
  }
}

// --- Lidas: { id: data em que foi lida } -----------------------------------
let lidas = ler(CHAVES.lidas, {});
{
  // Esquece lidas antigas para o armazenamento não crescer para sempre
  const limite = Date.now() - DIAS_PARA_ESQUECER_LIDAS * 86400000;
  for (const [id, quando] of Object.entries(lidas)) if (quando < limite) delete lidas[id];
  gravar(CHAVES.lidas, lidas);
}

export const estaLida = (id) => Boolean(lidas[id]);

export function marcarLida(id, lida = true) {
  if (lida) lidas[id] = Date.now();
  else delete lidas[id];
  gravar(CHAVES.lidas, lidas);
}

// --- Salvos: lista com a notícia inteira (o noticias.json muda a cada coleta) ---
let salvos = ler(CHAVES.salvos, []);
if (!Array.isArray(salvos)) salvos = [];

export const listarSalvos = () => [...salvos].sort((a, b) => b.salvoEm - a.salvoEm);
export const estaSalva = (id) => salvos.some((s) => s.id === id);

export function alternarSalva(noticia) {
  if (estaSalva(noticia.id)) {
    salvos = salvos.filter((s) => s.id !== noticia.id);
  } else {
    const { id, titulo, resumo, link, fonte, oficial, data, tambemEm, aba } = noticia;
    salvos.push({ id, titulo, resumo, link, fonte, oficial, data, tambemEm, aba, salvoEm: Date.now() });
  }
  gravar(CHAVES.salvos, salvos);
  return estaSalva(noticia.id);
}

// --- Última aba aberta -------------------------------------------------------
export const ultimaAba = () => ler(CHAVES.aba, null);
export const lembrarAba = (aba) => gravar(CHAVES.aba, aba);
