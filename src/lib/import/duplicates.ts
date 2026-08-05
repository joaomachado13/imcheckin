import { normalizeSearchText } from '@/lib/search/normalize';

export interface DuplicateAnalysis<T extends { nome: string; ministerios?: string[] }> {
  /** Itens únicos prontos para importar (com ministérios mesclados) */
  unique: T[];
  /** Nomes que apareciam em múltiplas linhas e foram fundidos em 1 registro */
  internalDuplicates: { nome: string; count: number; ministerios?: string[] }[];
  /** Itens cujo nome já existe na base de dados */
  existingDuplicates: T[];
  /** Total de linhas brutas lidas da planilha (antes do agrupamento) */
  totalParsed: number;
}

/**
 * Analisa lista importada (já agrupada por pessoa) contra base existente.
 * NÃO faz re-agrupamento — recebe a lista já processada.
 * Comparação ignora acento e caixa.
 */
export function analyzeImportDuplicates<T extends { nome: string; ministerios?: string[] }>(
  parsed: T[],
  existingNames: string[],
  rawCount?: number
): DuplicateAnalysis<T> {
  // totalParsed = linhas brutas se fornecido, senão usa o tamanho da lista atual
  const totalParsed = rawCount !== undefined ? rawCount : parsed.length;
  const existingSet = new Set(existingNames.map((n) => normalizeSearchText(n)));

  const internalDuplicates: { nome: string; count: number; ministerios?: string[] }[] = [];
  const existingDuplicates: T[] = [];
  const unique: T[] = [];

  for (const item of parsed) {
    const key = normalizeSearchText(item.nome);
    if (!key) continue;

    if (existingSet.has(key)) {
      existingDuplicates.push(item);
    } else {
      unique.push(item);
    }
  }

  return {
    unique,
    internalDuplicates,
    existingDuplicates,
    totalParsed,
  };
}
