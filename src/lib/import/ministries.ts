import { normalizeSearchText } from '@/lib/search/normalize';

/** Divide uma célula de ministérios em uma lista limpa. Aceita , ; / | e quebras. */
export function parseMinistries(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      String(raw)
        .split(/[,;/|]+/)
        .map((m) => m.trim().replace(/\s+/g, ' '))
        .filter((m) => m.length > 0)
    )
  );
}

/** Nome canônico para agrupar ministérios escritos de formas diferentes. */
export function ministryKey(name: string): string {
  return normalizeSearchText(name).trim();
}

export interface MinistryStats {
  key: string;
  label: string;
  total: number;
  retirados: number;
  pendentes: number;
  percent: number;
}

export function buildMinistryStats<
  T extends { ministerios?: string[] | null; status: string }
>(rows: T[]): MinistryStats[] {
  const map = new Map<string, { label: string; total: number; retirados: number }>();

  rows.forEach((row) => {
    const list = row.ministerios && row.ministerios.length > 0 ? row.ministerios : ['Sem ministério'];
    list.forEach((m) => {
      const key = ministryKey(m);
      const entry = map.get(key) || { label: m, total: 0, retirados: 0 };
      entry.total += 1;
      if (row.status === 'resgatado') entry.retirados += 1;
      map.set(key, entry);
    });
  });

  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      total: v.total,
      retirados: v.retirados,
      pendentes: v.total - v.retirados,
      percent: v.total > 0 ? Math.round((v.retirados / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function belongsToMinistry(
  row: { ministerios?: string[] | null },
  key: string
): boolean {
  const list = row.ministerios && row.ministerios.length > 0 ? row.ministerios : ['Sem ministério'];
  return list.some((m) => ministryKey(m) === key);
}
