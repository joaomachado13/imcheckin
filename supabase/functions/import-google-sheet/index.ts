import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SheetRow {
  data_compra?: string;
  nome: string;
  contato?: string;
  num_ingressos: number;
  entrega?: string;
}

function validateGoogleSheetUrl(url: string): { valid: boolean; sheetId: string | null; error?: string } {
  if (!url || typeof url !== 'string' || url.length > 500) {
    return { valid: false, sheetId: null, error: 'URL inválida' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, sheetId: null, error: 'URL mal formatada' };
  }

  // Only allow docs.google.com domain
  if (parsedUrl.hostname !== 'docs.google.com') {
    return { valid: false, sheetId: null, error: 'Apenas URLs do Google Sheets são permitidas (docs.google.com)' };
  }

  // Extract and validate sheet ID (typical length: 20-60 chars)
  const sheetIdPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,60})(?:\/|$|\?)/;
  const match = url.match(sheetIdPattern);

  if (!match) {
    // Fallback to simpler pattern
    const simpleMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!simpleMatch || simpleMatch[1].length < 10 || simpleMatch[1].length > 100) {
      return { valid: false, sheetId: null, error: 'URL inválida. Use o link de compartilhamento do Google Sheets.' };
    }
    return { valid: true, sheetId: simpleMatch[1] };
  }

  return { valid: true, sheetId: match[1] };
}

function parseCSV(csv: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentLine.push(currentCell.trim());
        if (currentLine.some(cell => cell !== '')) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n after \r
      } else {
        currentCell += char;
      }
    }
  }

  // Don't forget the last cell/line
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.some(cell => cell !== '')) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function mapColumnsToData(headers: string[], row: string[]): SheetRow | null {
  // Find column indices (case insensitive, flexible matching)
  const findCol = (patterns: string[]): number => {
    return headers.findIndex(h => 
      patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const dataCol = findCol(['data', 'date']);
  const nomeCol = findCol(['nome', 'name', 'comprador']);
  const contatoCol = findCol(['contato', 'telefone', 'phone', 'celular', 'whatsapp']);
  const ingressosCol = findCol(['ingresso', 'ticket', 'qtd', 'quantidade', 'nº']);
  const entregaCol = findCol(['entrega', 'delivery', 'retirada']);

  // Nome is required
  if (nomeCol === -1 || !row[nomeCol]) {
    return null;
  }

  const numIngressos = ingressosCol >= 0 ? parseInt(row[ingressosCol]) || 1 : 1;

  return {
    data_compra: dataCol >= 0 ? row[dataCol] || undefined : undefined,
    nome: row[nomeCol],
    contato: contatoCol >= 0 ? row[contatoCol] || undefined : undefined,
    num_ingressos: numIngressos,
    entrega: entregaCol >= 0 ? row[entregaCol] || undefined : undefined,
  };
}

async function fetchSheetData(sheetId: string): Promise<{ csv: string | null; error: string | null }> {
  // Try multiple URL formats
  const urls = [
    // Published to web CSV export
    `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`,
    // Alternative gviz endpoint
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
    // Standard export (requires "Publish to web")
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Check content length header
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
          return { csv: null, error: 'Planilha muito grande (máximo 5MB)' };
        }

        const text = await response.text();
        
        // Additional size check after download
        if (text.length > 5 * 1024 * 1024) {
          return { csv: null, error: 'Planilha muito grande (máximo 5MB)' };
        }

        // Check if it's actually CSV data (not an HTML error page)
        if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
          return { csv: text, error: null };
        }
      }
      // Consume body even on error to avoid resource leak
      await response.text().catch(() => {});
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.error(`Request timeout for ${url}`);
      } else {
        console.error(`Failed to fetch from ${url}:`, e);
      }
    }
  }

  return { 
    csv: null, 
    error: 'Não foi possível acessar a planilha. Para importar, a planilha precisa estar PUBLICADA NA WEB (Arquivo → Compartilhar → Publicar na web → Publicar). Apenas "Qualquer pessoa com o link" não é suficiente.' 
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT verification failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check if user is approved and is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('approval_status')
      .eq('user_id', userId)
      .single();

    if (profileError || profile?.approval_status !== 'approved') {
      console.error('User not approved:', profileError);
      return new Response(
        JSON.stringify({ error: 'Usuário não aprovado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin (only admins can import)
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('User is not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem importar planilhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated and authorized:', userId);

    // ========== PROCESS SHEET ==========
    const { sheetUrl } = await req.json();

    // Validate URL
    const validation = validateGoogleSheetUrl(sheetUrl);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error || 'URL inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetId = validation.sheetId!;
    console.log('Fetching sheet:', sheetId);

    const { csv: csvText, error: fetchError } = await fetchSheetData(sheetId);

    if (fetchError || !csvText) {
      return new Response(
        JSON.stringify({ error: fetchError || 'Erro ao acessar planilha' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Planilha vazia ou sem dados suficientes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const buyers: SheetRow[] = [];
    for (const row of dataRows) {
      const buyer = mapColumnsToData(headers, row);
      if (buyer) {
        buyers.push(buyer);
      }
    }

    if (buyers.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum comprador encontrado. Verifique se a planilha tem uma coluna NOME.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully parsed ${buyers.length} buyers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        buyers,
        message: `${buyers.length} compradores encontrados` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar planilha' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
