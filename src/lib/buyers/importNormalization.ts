export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isValidUtcDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/**
 * Converte datas comuns do Sheets para um formato aceito por coluna Postgres DATE.
 * - Aceita: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
 * - Se não houver ano (ex: "07/01"), retorna null para não quebrar a importação.
 */
export function parsePurchaseDateForDb(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let s = String(raw).trim();
  if (!s) return null;

  // Remove BOM e padrões comuns do Google/Excel (ex: ="07/01/2026")
  s = s.replace(/^\uFEFF/, '').trim();
  s = s.replace(/^=\s*"?/, '').replace(/"?\s*$/, '').trim();

  // Remove aspas/apóstrofos nas pontas (mesmo se estiverem “sobrando”)
  s = s.replace(/^["']+/, '').replace(/["']+$/, '').trim();

  // Se vier com horário, mantém apenas a parte da data
  const token = s.split(/\s+/)[0];

  // ISO: YYYY-MM-DD
  let m = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!isValidUtcDate(year, month, day)) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // BR: DD/MM/YYYY (ou DD-MM-YYYY)
  m = token.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = m[3];
    if (!yearRaw) return null; // Sem ano → não é um DATE válido

    let year = Number(yearRaw);
    if (yearRaw.length === 2) year = 2000 + year; // 24 -> 2024

    if (!isValidUtcDate(year, month, day)) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return null;
}

/**
 * Detecta se a coluna entrega indica que já foi entregue.
 * Padrões comuns: "ok", "OK", "ok 01/01", "entregue", etc.
 */
export function isAlreadyDelivered(entrega: string | null | undefined): boolean {
  if (!entrega) return false;
  const normalized = entrega.toLowerCase().trim();
  // Matches: "ok", "ok 01/01/2025", "ok - entregue", "entregue", etc.
  return normalized.startsWith('ok') || normalized.includes('entregue') || normalized.includes('retirado');
}

export function normalizeImportedBuyer<T extends { data_compra?: string; nome: string; contato?: string; entrega?: string; num_ingressos?: number; ministerios?: string[] }>(
  buyer: T
) {
  const alreadyDelivered = isAlreadyDelivered(buyer.entrega);
  
  return {
    ...buyer,
    nome: buyer.nome?.trim() ?? buyer.nome,
    contato: buyer.contato?.trim() || null,
    entrega: buyer.entrega?.trim() || null,
    ministerios: buyer.ministerios ?? [],
    data_compra: parsePurchaseDateForDb(buyer.data_compra ?? null),
    num_ingressos: 1, // Cada nome/pessoa tem direito a exatamente 1 ingresso
    // Se já entregue, marca o 1 ingresso como resgatado
    ...(alreadyDelivered && {
      ingressos_resgatados: 1,
      status: 'resgatado' as const,
    }),
  };
}
