// Explicador de termos: encontra palavras do glossário num texto e devolve pedaços
// (texto comum ou termo) para o app montar a tela sem usar innerHTML.

let glossario = [];
let regex = null;
const porVariante = new Map();

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function carregarGlossario(lista) {
  glossario = Array.isArray(lista) ? lista : [];
  porVariante.clear();
  const variantes = [];
  for (const termo of glossario) {
    for (const v of [termo.termo, ...(termo.variantes || [])]) {
      porVariante.set(v.toLowerCase(), termo);
      variantes.push(v);
    }
  }
  // Mais longas primeiro ("Tesouro Direto" antes de "Tesouro"); só palavra inteira
  variantes.sort((a, b) => b.length - a.length);
  regex = variantes.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${variantes.map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    : null;
}

export const buscarTermo = (id) => glossario.find((t) => t.id === id);

/**
 * Divide o texto em pedaços: [{ texto }, { texto, termo }].
 * Cada termo é destacado só na primeira vez que aparece (por notícia), para não poluir.
 * `jaUsados` é compartilhado entre título e resumo da mesma notícia.
 */
export function dividirEmTermos(texto, jaUsados = new Set()) {
  if (!regex || !texto) return [{ texto: texto || '' }];
  const pedacos = [];
  let ultimo = 0;
  for (const m of texto.matchAll(regex)) {
    const termo = porVariante.get(m[0].toLowerCase());
    if (!termo || jaUsados.has(termo.id)) continue;
    jaUsados.add(termo.id);
    if (m.index > ultimo) pedacos.push({ texto: texto.slice(ultimo, m.index) });
    pedacos.push({ texto: m[0], termo });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) pedacos.push({ texto: texto.slice(ultimo) });
  return pedacos;
}
