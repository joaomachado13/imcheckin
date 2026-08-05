/**
 * Normaliza texto para busca: minúsculas + remove acentos/diacríticos.
 * Ex.: "João" -> "joao", "Conceição" -> "conceicao"
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se `haystack` contém `needle` ignorando acentos e caixa.
 */
export function matchesNormalized(
  haystack: string | null | undefined,
  needle: string | null | undefined
): boolean {
  const n = normalizeSearchText(needle);
  if (!n) return true;
  return normalizeSearchText(haystack).includes(n);
}
