import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateGoogleSheetUrl(url: string): { valid: boolean; sheetId: string | null; error?: string } {
  if (!url || typeof url !== 'string' || url.length > 500) {
    return { valid: false, sheetId: null, error: 'URL inválida' };
  }
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { return { valid: false, sheetId: null, error: 'URL mal formatada' }; }
  if (parsedUrl.hostname !== 'docs.google.com') {
    return { valid: false, sheetId: null, error: 'Apenas URLs do Google Sheets (docs.google.com)' };
  }
  const sheetIdPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,60})(?:\/|$|\?)/;
  const match = url.match(sheetIdPattern);
  if (!match) {
    const simple = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!simple || simple[1].length < 10 || simple[1].length > 100) {
      return { valid: false, sheetId: null, error: 'URL inválida. Use o link de compartilhamento do Google Sheets.' };
    }
    return { valid: true, sheetId: simple[1] };
  }
  return { valid: true, sheetId: match[1] };
}

function parseCSV(csv: string): string[][] {
  const lines: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i], nx = csv[i + 1];
    if (q) {
      if (ch === '"' && nx === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { cur.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        cur.push(cell.trim());
        if (cur.some(c => c !== '')) lines.push(cur);
        cur = []; cell = '';
        if (ch === '\r') i++;
      } else cell += ch;
    }
  }
  if (cell || cur.length > 0) {
    cur.push(cell.trim());
    if (cur.some(c => c !== '')) lines.push(cur);
  }
  return lines;
}

async function fetchSheetData(sheetId: string): Promise<{ csv: string | null; error: string | null }> {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/csv,text/plain,*/*' } });
      clearTimeout(t);
      if (res.ok) {
        const cl = res.headers.get('content-length');
        if (cl && parseInt(cl) > 5 * 1024 * 1024) return { csv: null, error: 'Planilha muito grande (máx 5MB)' };
        const text = await res.text();
        if (text.length > 5 * 1024 * 1024) return { csv: null, error: 'Planilha muito grande (máx 5MB)' };
        if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
          return { csv: text, error: null };
        }
      }
      await res.text().catch(() => {});
    } catch (e) {
      console.error('fetch fail', url, e);
    }
  }
  return { csv: null, error: 'Não foi possível acessar a planilha. Ela precisa estar PUBLICADA NA WEB (Arquivo → Compartilhar → Publicar na web).' };
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabaseClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    // Must be approved admin
    const { data: profile } = await supabaseClient.from('profiles').select('approval_status').eq('user_id', userId).single();
    if (profile?.approval_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Usuário não aprovado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('user_id', userId).single();
    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem sincronizar' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { sheetUrl } = await req.json();
    const v = validateGoogleSheetUrl(sheetUrl);
    if (!v.valid) {
      return new Response(JSON.stringify({ error: v.error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { csv, error: fetchErr } = await fetchSheetData(v.sheetId!);
    if (fetchErr || !csv) {
      return new Response(JSON.stringify({ error: fetchErr || 'Erro ao acessar planilha' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'Planilha vazia ou sem dados' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auto-detect header row: search first 10 rows for one containing "nome" or "name"
    let headerRowIdx = -1;
    let nameCol = -1;
    const searchLimit = Math.min(10, rows.length);
    for (let r = 0; r < searchLimit; r++) {
      const idx = rows[r].findIndex(h => /^(nome|name)$/i.test(h.trim()));
      if (idx !== -1) {
        headerRowIdx = r;
        nameCol = idx;
        break;
      }
    }
    // If no explicit header found, fall back to first non-empty row, first column
    if (headerRowIdx === -1) {
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].some(c => c.trim() !== '')) {
          headerRowIdx = r;
          nameCol = 0;
          break;
        }
      }
    }
    const colToUse = nameCol === -1 ? 0 : nameCol;
    const dataStart = headerRowIdx + 1;

    // Extract unique normalized names from sheet (preserve display name)
    const sheetNames = new Map<string, string>(); // normalized -> display name
    for (let i = dataStart; i < rows.length; i++) {
      const raw = rows[i][colToUse]?.trim();
      if (!raw) continue;
      const norm = normalizeName(raw);
      if (!norm || norm === 'nome' || norm === 'name') continue;
      if (!sheetNames.has(norm)) sheetNames.set(norm, raw);
    }

    if (sheetNames.size === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum nome encontrado na planilha' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch existing (non-removed) volunteers
    const { data: existing, error: existErr } = await supabaseClient
      .from('volunteers')
      .select('id, nome')
      .eq('removido', false);
    if (existErr) throw existErr;

    const existingByNorm = new Map<string, { id: string; nome: string }>();
    (existing || []).forEach(v => existingByNorm.set(normalizeName(v.nome), v));

    // Determine which to insert (in sheet but not in db)
    const toInsert: Array<{ nome: string }> = [];
    for (const [norm, display] of sheetNames) {
      if (!existingByNorm.has(norm)) toInsert.push({ nome: display });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: insErr } = await supabaseClient.from('volunteers').insert(toInsert);
      if (insErr) throw insErr;
      inserted = toInsert.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        total_in_sheet: sheetNames.size,
        already_existed: sheetNames.size - inserted,
        message: inserted > 0
          ? `${inserted} novo(s) voluntário(s) adicionado(s). ${sheetNames.size - inserted} já existiam (resgates preservados).`
          : `Tudo sincronizado. Nenhum nome novo encontrado.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('sync error', e);
    return new Response(JSON.stringify({ error: 'Erro ao sincronizar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
