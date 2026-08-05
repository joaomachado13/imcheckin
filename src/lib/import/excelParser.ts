import * as XLSX from 'xlsx';
import { normalizeSearchText } from '@/lib/search/normalize';
import { parseMinistries } from '@/lib/import/ministries';

export interface ParsedBuyer {
  data_compra?: string;
  nome: string;
  contato?: string;
  num_ingressos: number;
  entrega?: string;
  ministerios?: string[];
}

/**
 * Mapeadores de colunas — qualquer variação comum de nome de coluna.
 * Usamos regex flexível para cobrir erros de digitação e variações.
 */
const HEADER_MATCHERS: Record<keyof ParsedBuyer, RegExp> = {
  data_compra: /(^data$|data[\s_-]?(compra|inscri|pedido)|purchase[\s_-]?date)/i,
  nome: /^(nome|name|participante|nome[\s_-]?completo|comprador|aluno|membro|person|candidate|candidato|inscrito)$/i,
  contato: /(contato|telefone|celular|whatsapp|fone|mobile|phone|tel\.?|n[uú]mero)/i,
  num_ingressos: /(ingresso|qtd|quant|tickets?|num_ingressos|n[oº°]\.?\s*ingresso)/i,
  entrega: /(entrega|retirad|status|delivery)/i,
  ministerios: /(minist[eé]rio|equipe|area|[aá]rea|setor|fun[cç][aã]o|aba|group|grupo|team|departamento)/i,
};

/**
 * Extrai uma string limpa de qualquer valor bruto de célula Excel.
 * Trata undefined, null, number, Date, etc.
 */
function cellToString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return val.toLocaleDateString('pt-BR');
  return String(val).trim();
}

/**
 * Normaliza e agrupa linhas repetidas de uma mesma pessoa em um único registro,
 * fundindo todos os seus ministérios em uma lista única e mantendo 1 ingresso por pessoa.
 */
export function groupAndMergeBuyers(rawList: ParsedBuyer[]): ParsedBuyer[] {
  const map = new Map<string, ParsedBuyer>();

  for (const item of rawList) {
    const rawName = item.nome ? item.nome.trim() : '';
    if (!rawName) continue;

    const key = normalizeSearchText(rawName);
    if (!key) continue;

    const itemMinistries = Array.isArray(item.ministerios)
      ? parseMinistries(item.ministerios.join(','))
      : parseMinistries(item.ministerios ?? '');

    if (!map.has(key)) {
      map.set(key, {
        ...item,
        nome: rawName,
        contato: item.contato ? item.contato.trim() : undefined,
        num_ingressos: 1, // Cada nome/pessoa tem direito a exatamente 1 ingresso
        ministerios: itemMinistries,
      });
    } else {
      const existing = map.get(key)!;
      // Fundir ministérios únicos de todas as linhas da mesma pessoa
      const mergedMinistries = Array.from(
        new Set([...(existing.ministerios || []), ...itemMinistries])
      );

      // Preservar telefone se faltar
      const mergedContato = existing.contato || (item.contato ? item.contato.trim() : undefined);
      const mergedData = existing.data_compra || item.data_compra;
      const mergedEntrega = existing.entrega || item.entrega;

      map.set(key, {
        ...existing,
        contato: mergedContato,
        data_compra: mergedData,
        entrega: mergedEntrega,
        num_ingressos: 1,
        ministerios: mergedMinistries,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Converte matriz de valores bruta de uma planilha (linhas x colunas) em ParsedBuyer[].
 * NÃO faz agrupamento — retorna cada linha como um registro separado.
 * REGRA: Se a célula NOME tiver algum valor, a linha é incluída,
 * independentemente de outras colunas estarem vazias.
 */
export function parseRawRowsToBuyers(rawRows: any[][]): ParsedBuyer[] {
  if (!rawRows || rawRows.length === 0) return [];

  // Filtra linhas completamente vazias
  const nonEmptyRows = rawRows.filter((row) =>
    row && row.some((cell) => cellToString(cell).length > 0)
  );

  if (nonEmptyRows.length === 0) return [];

  // Tenta localizar o cabeçalho nas primeiras 15 linhas
  let headerRowIndex = -1;
  const colMap: Partial<Record<keyof ParsedBuyer, number>> = {};

  for (let r = 0; r < Math.min(nonEmptyRows.length, 15); r++) {
    const rowStr = nonEmptyRows[r].map((cell) => normalizeSearchText(cellToString(cell)));
    const hasNameHeader = rowStr.some((cell) => HEADER_MATCHERS.nome.test(cell));

    if (hasNameHeader) {
      headerRowIndex = r;
      (Object.keys(HEADER_MATCHERS) as (keyof ParsedBuyer)[]).forEach((field) => {
        const idx = rowStr.findIndex((cell) => HEADER_MATCHERS[field].test(cell));
        if (idx >= 0) colMap[field] = idx;
      });
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const rawList: ParsedBuyer[] = [];

  for (let r = startRow; r < nonEmptyRows.length; r++) {
    const row = nonEmptyRows[r];
    if (!row || row.length === 0) continue;

    let nome: string | undefined;
    let data_compra: string | undefined;
    let contato: string | undefined;
    let num_ingressos = 1;
    let entrega: string | undefined;
    let ministerios: string[] = [];

    if (headerRowIndex >= 0) {
      const val = (field: keyof ParsedBuyer): string | undefined => {
        if (colMap[field] === undefined) return undefined;
        const cellVal = cellToString(row[colMap[field] as number]);
        return cellVal || undefined;
      };

      nome = val('nome');

      // Tolerância: se a coluna NOME não foi mapeada ou está vazia, tenta achar
      // um valor longo em qualquer coluna que possa ser um nome próprio
      if (!nome) {
        for (let c = 0; c < Math.min(row.length, 5); c++) {
          const cellVal = cellToString(row[c]);
          if (cellVal.length >= 3 && /[a-zA-ZÀ-ÿ]{2,}/.test(cellVal) && !/^\d+[\/\-]\d+/.test(cellVal)) {
            nome = cellVal;
            break;
          }
        }
      }

      data_compra = val('data_compra');
      contato = val('contato');
      const ingStr = val('num_ingressos');
      num_ingressos = ingStr ? parseInt(ingStr, 10) || 1 : 1;
      entrega = val('entrega');
      ministerios = parseMinistries(val('ministerios'));

    } else if (row.length === 1) {
      nome = cellToString(row[0]);
    } else {
      for (let c = 0; c < Math.min(row.length, 3); c++) {
        const cellVal = cellToString(row[c]);
        if (cellVal.length >= 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(cellVal)) {
          nome = cellVal;
          if (c === 0) {
            if (row.length > 1) ministerios = parseMinistries(row[1]);
            if (row.length > 2) contato = cellToString(row[2]) || undefined;
            if (row.length > 3) num_ingressos = parseInt(cellToString(row[3]), 10) || 1;
            if (row.length > 4) entrega = cellToString(row[4]) || undefined;
          }
          break;
        }
      }
    }

    // REGRA PRINCIPAL: inclui qualquer linha que tenha um nome com ao menos 2 caracteres
    // Campos vazios (ministérios, telefone, etc.) NÃO causam descarte da linha
    if (nome && nome.trim().length >= 2) {
      rawList.push({ data_compra, nome: nome.trim(), contato, num_ingressos, entrega, ministerios });
    }
  }

  // *** SEM AGRUPAMENTO AQUI ***
  // O agrupamento acontece UMA ÚNICA VEZ no final de parseExcelFile,
  // após combinar todas as abas da planilha.
  return rawList;
}

/**
 * Lê um arquivo File do computador (.xlsx, .xls ou .csv) e devolve TODOS os registros,
 * sem qualquer agrupamento ou deduplicação.
 * Cada linha da planilha que tiver um nome válido vira um registro separado.
 */
export async function parseExcelFile(file: File): Promise<{ rawCount: number; buyers: ParsedBuyer[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  let allRawRows: ParsedBuyer[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows && rows.length > 0) {
      // parseRawRowsToBuyers retorna linhas brutas sem agrupar
      const parsed = parseRawRowsToBuyers(rows);
      console.log(`[ExcelParser] Aba "${sheetName}": ${rows.length} linhas brutas → ${parsed.length} registros lidos`);
      allRawRows.push(...parsed);
    }
  }

  console.log(`[ExcelParser] Total de registros (sem agrupamento): ${allRawRows.length}`);

  return {
    rawCount: allRawRows.length,
    buyers: allRawRows, // Retorna TODOS os registros, sem mesclar ninguém
  };
}
