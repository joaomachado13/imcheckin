import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/hooks/useEvents';
import { useBuyers, useImportBuyers, useImportFromGoogleSheet, useEventRedemptions, useDeleteAllBuyers, useDeleteBuyers } from '@/hooks/useBuyers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Upload,
  Download,
  Search,
  Loader2,
  Users,
  Ticket,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Link as LinkIcon,
  Layers,
  Trash2,
  Copy,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { normalizeSearchText } from '@/lib/search/normalize';
import { analyzeImportDuplicates, type DuplicateAnalysis } from '@/lib/import/duplicates';
import { ImportDuplicatesPreview } from '@/components/ImportDuplicatesPreview';
import { parseMinistries } from '@/lib/import/ministries';
import { MinistryControl } from '@/components/MinistryControl';
import { parseExcelFile, groupAndMergeBuyers, type ParsedBuyer } from '@/lib/import/excelParser';
import { QuickRedeemModal } from '@/components/QuickRedeemModal';
import { Buyer } from '@/hooks/useBuyers';

const HEADER_MATCHERS: Record<keyof ParsedBuyer, RegExp> = {
  data_compra: /(^data$|data[\s_-]?(compra|inscri|pedido)|purchase[\s_-]?date)/i,
  nome: /^(nome|name|participante|nome[\s_-]?completo|comprador|aluno|membro|person|candidate|candidato|inscrito)$/i,
  contato: /(contato|telefone|celular|whatsapp|fone|mobile|phone|tel\.?|n[uú]mero)/i,
  num_ingressos: /(ingresso|qtd|quant|tickets?|num_ingressos|n[oº°]\.?\s*ingresso)/i,
  entrega: /(entrega|retirad|status|delivery)/i,
  ministerios: /(minist[eé]rio|equipe|area|[aá]rea|setor|fun[cç][aã]o|aba|group|grupo|team|departamento)/i,
};

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { isAdmin } = useAuth();
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: buyers, isLoading: buyersLoading } = useBuyers(eventId);
  const { data: redemptions } = useEventRedemptions(eventId);
  const importBuyers = useImportBuyers();
  const importFromSheet = useImportFromGoogleSheet();
  const deleteAllBuyers = useDeleteAllBuyers();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState(() => {
    return (eventId && sessionStorage.getItem(`event_search_${eventId}`)) || '';
  });

  const updateSearchTerm = (val: string) => {
    setSearchTerm(val);
    if (eventId) {
      if (val) {
        sessionStorage.setItem(`event_search_${eventId}`, val);
      } else {
        sessionStorage.removeItem(`event_search_${eventId}`);
      }
    }
  };

  // Estado para Resgate Rapido ao clicar no comprador
  const [selectedBuyerForRedeem, setSelectedBuyerForRedeem] = useState<Buyer | null>(null);
  const [isQuickRedeemOpen, setIsQuickRedeemOpen] = useState(false);

  const handleOpenQuickRedeem = (buyer: Buyer) => {
    setSelectedBuyerForRedeem(buyer);
    setIsQuickRedeemOpen(true);
  };

  // Estado para zerar/limpar a lista de compradores
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState('');

  const handleWipeAll = async () => {
    if (!eventId) return;
    await deleteAllBuyers.mutateAsync(eventId);
    setIsWipeOpen(false);
    setWipeConfirm('');
  };

  // Estado para upload direto de arquivo .xlsx/.xls
  const [excelFileName, setExcelFileName] = useState('');
  const [excelBuyers, setExcelBuyers] = useState<ParsedBuyer[]>([]);
  const [excelRawCount, setExcelRawCount] = useState(0);
  const [isReadingExcel, setIsReadingExcel] = useState(false);

  const handleExcelFileChange = async (file: File | null) => {
    if (!file) {
      setExcelFileName('');
      setExcelBuyers([]);
      setExcelRawCount(0);
      return;
    }
    setExcelFileName(file.name);
    setIsReadingExcel(true);
    try {
      const { buyers: parsed, rawCount } = await parseExcelFile(file);
      setExcelBuyers(parsed);
      setExcelRawCount(rawCount);
    } catch (err) {
      console.error('Erro ao ler arquivo Excel:', err);
    } finally {
      setIsReadingExcel(false);
    }
  };

  const parseCsvBuyers = (raw: string): ParsedBuyer[] => {
    const lines = raw.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) return [];
    const parsedBuyers: ParsedBuyer[] = [];

    // Mapeamento flexível de colunas quando existe cabeçalho
    const headerCols = lines[0].split('\t').map((c) => normalizeSearchText(c.trim()));
    const hasHeader = headerCols.some((c) => HEADER_MATCHERS.nome.test(c));
    const idx: Partial<Record<keyof ParsedBuyer, number>> = {};
    if (hasHeader) {
      (Object.keys(HEADER_MATCHERS) as (keyof ParsedBuyer)[]).forEach((field) => {
        const i = headerCols.findIndex((c) => HEADER_MATCHERS[field].test(c));
        if (i >= 0) idx[field] = i;
      });
    }

    const startIdx = hasHeader || /nome|name/i.test(lines[0]) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split('\t').map((c) => c.trim());
      let nome: string | undefined;
      let data_compra: string | undefined;
      let contato: string | undefined;
      let num_ingressos = 1;
      let entrega: string | undefined;
      let ministerios: string[] = [];

      if (hasHeader) {
        // Retorna o valor da célula, ou undefined se a coluna não foi mapeada ou está vazia
        const at = (field: keyof ParsedBuyer) =>
          idx[field] !== undefined ? cols[idx[field] as number] || undefined : undefined;
        nome = at('nome');
        data_compra = at('data_compra');
        contato = at('contato');
        num_ingressos = parseInt(at('num_ingressos') || '') || 1;
        entrega = at('entrega');
        // Campo ministério vazio NÃO descarta a linha
        ministerios = parseMinistries(at('ministerios'));
      } else if (cols.length === 1) {
        nome = cols[0];
      } else {
        data_compra = cols[0] || undefined;
        nome = cols[1] || cols[0];
        contato = cols[2] || undefined;
        num_ingressos = parseInt(cols[3]) || 1;
        entrega = cols[4] || undefined;
        ministerios = parseMinistries(cols[5]);
      }

      // REGRA PRINCIPAL: inclui a linha se tiver um nome com ao menos 2 caracteres
      // Colunas vazias (ministério, telefone, data) NÃO causam descarte
      if (nome && nome.trim().length >= 2) {
        parsedBuyers.push({ data_compra, nome: nome.trim(), contato, num_ingressos, entrega, ministerios });
      }
    }
    return groupAndMergeBuyers(parsedBuyers);
  };

  // Preview de duplicados em tempo real (Excel)
  const excelAnalysis = useMemo<DuplicateAnalysis<ParsedBuyer> | null>(() => {
    if (excelBuyers.length === 0) return null;
    const existingNames = (buyers || []).map((b) => b.nome);
    // rawCount = linhas brutas reais da planilha antes do agrupamento
    return analyzeImportDuplicates(excelBuyers, existingNames, excelRawCount);
  }, [excelBuyers, buyers, excelRawCount]);

  // Preview de duplicados em tempo real (CSV/Texto)
  const csvAnalysis = useMemo<DuplicateAnalysis<ParsedBuyer> | null>(() => {
    if (!csvData.trim()) return null;
    const parsed = parseCsvBuyers(csvData);
    if (parsed.length === 0) return null;
    const existingNames = (buyers || []).map((b) => b.nome);
    return analyzeImportDuplicates(parsed, existingNames);
  }, [csvData, buyers]);

  // Pergunta na IMPORTAÇÃO quando há nomes repetidos
  const [pendingImport, setPendingImport] = useState<
    { source: 'excel' | 'csv'; analysis: DuplicateAnalysis<ParsedBuyer> } | null
  >(null);

  const runImport = async (
    source: 'excel' | 'csv',
    analysis: DuplicateAnalysis<ParsedBuyer>,
    removeDuplicates: boolean
  ) => {
    if (!eventId) return;
    const list = removeDuplicates
      ? analysis.unique
      : [...analysis.unique, ...analysis.existingDuplicates];
    if (list.length === 0) return;
    await importBuyers.mutateAsync({ eventId, buyers: list });
    setPendingImport(null);
    if (source === 'excel') {
      setExcelFileName('');
      setExcelBuyers([]);
      setExcelRawCount(0);
    } else {
      setCsvData('');
    }
    setIsImportOpen(false);
  };

  const startImport = (source: 'excel' | 'csv', analysis: DuplicateAnalysis<ParsedBuyer> | null) => {
    if (!analysis) return;
    const hasDuplicates =
      analysis.existingDuplicates.length > 0 || analysis.internalDuplicates.length > 0;
    if (hasDuplicates) {
      setPendingImport({ source, analysis });
      return;
    }
    runImport(source, analysis, false);
  };

  const handleImportExcel = () => startImport('excel', excelAnalysis);
  const handleImportCSV = () => startImport('csv', csvAnalysis);

  const handleImportGoogleSheet = async () => {
    if (!eventId || !sheetUrl.trim()) return;

    await importFromSheet.mutateAsync({ eventId, sheetUrl });
    setSheetUrl('');
    setIsImportOpen(false);
  };

  // ---- Nomes repetidos na lista final ----
  const duplicateGroups = useMemo(() => {
    if (!buyers) return [] as { nome: string; count: number; ids: string[] }[];
    const map = new Map<string, { nome: string; count: number; ids: string[] }>();
    buyers.forEach((b) => {
      const key = normalizeSearchText(b.nome);
      if (!key) return;
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
        cur.ids.push(b.id!);
      } else {
        map.set(key, { nome: b.nome, count: 1, ids: [b.id!] });
      }
    });
    return Array.from(map.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [buyers]);

  const duplicateExtraCount = duplicateGroups.reduce((acc, g) => acc + (g.count - 1), 0);

  const [isDupCheckOpen, setIsDupCheckOpen] = useState(false);
  const deleteBuyers = useDeleteBuyers();

  const handleDeleteDuplicates = async () => {
    if (!eventId || duplicateGroups.length === 0) return;
    // mantém a primeira ocorrência de cada nome, apaga as demais
    const idsToDelete = duplicateGroups.flatMap((g) => g.ids.slice(1));
    await deleteBuyers.mutateAsync({ eventId, buyerIds: idsToDelete });
    setIsDupCheckOpen(false);
  };

  const handleExportClick = () => {
    exportExcel(false);
  };


  const exportExcel = (removeDuplicates: boolean) => {
    if (!buyers || !event || !isAdmin) return;

    // Se solicitado, mantém apenas a primeira ocorrência de cada nome
    const seen = new Set<string>();
    const exportBuyers = removeDuplicates
      ? buyers.filter((b) => {
          const key = normalizeSearchText(b.nome);
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      : buyers;


    // Create a map of redemptions by buyer_id for quick lookup
    const redemptionsByBuyer = new Map<string, typeof redemptions>();
    redemptions?.forEach((r) => {
      const existing = redemptionsByBuyer.get(r.buyer_id) || [];
      redemptionsByBuyer.set(r.buyer_id, [...existing, r]);
    });

    const rows: Record<string, string | number>[] = [];

    exportBuyers.forEach((buyer) => {
      const buyerRedemptions = redemptionsByBuyer.get(buyer.id!) || [];
      
      if (buyerRedemptions.length === 0) {
        rows.push({
          'Nome': buyer.nome,
          'Contato': buyer.contato || '',
          'Nº Ingressos': buyer.num_ingressos,
          'Resgatado': 'Não',
          'Retirado Por': '',
          'Operador': '',
          'Data/Hora Resgate': '',
          'Qtd Resgatados': 0,
        });
      } else {
        buyerRedemptions.forEach((redemption) => {
          const retiradoPor = redemption.resgatado_por_comprador 
            ? 'Próprio comprador' 
            : (redemption.nome_retirada || 'Terceiro');
          
          const dataHora = new Date(redemption.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          rows.push({
            'Nome': buyer.nome,
            'Contato': buyer.contato || '',
            'Nº Ingressos': buyer.num_ingressos,
            'Resgatado': 'Sim',
            'Retirado Por': retiradoPor,
            'Operador': redemption.operador_nome || '',
            'Data/Hora Resgate': dataHora,
            'Qtd Resgatados': redemption.quantidade,
          });
        });
      }
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 18 }, // Contato
      { wch: 12 }, // Nº Ingressos
      { wch: 10 }, // Resgatado
      { wch: 20 }, // Retirado Por
      { wch: 20 }, // Operador
      { wch: 18 }, // Data/Hora
      { wch: 14 }, // Qtd Resgatados
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    
    // Generate and download
    const fileName = `${event.name.replace(/[^a-z0-9]/gi, '_')}_relatorio_resgates.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Busca normalizada: ignora acentos e caixa
  const normalizedSearchTerm = searchTerm.replace(/\D/g, '');
  const normalizedNameSearch = normalizeSearchText(searchTerm);

  const filteredBuyers = useMemo(() => {
    if (!buyers) return [];
    if (!searchTerm.trim()) return buyers;

    return buyers.filter((b) => {
      // Nome: comparação sem acento e case-insensitive
      const nameMatch = normalizedNameSearch
        ? normalizeSearchText(b.nome).includes(normalizedNameSearch)
        : false;

      // Telefone: dígitos em sequência
      let phoneMatch = false;
      if (normalizedSearchTerm.length >= 3) {
        phoneMatch = b.contato_normalizado?.includes(normalizedSearchTerm) ?? false;
      }

      return nameMatch || phoneMatch;
    });
  }, [buyers, searchTerm, normalizedNameSearch, normalizedSearchTerm]);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'resgatado'>('todos');

  // Filter by status
  const statusFilteredBuyers = useMemo(() => {
    if (statusFilter === 'todos') return filteredBuyers;
    if (statusFilter === 'pendente') return filteredBuyers.filter(b => b.status === 'pendente' || b.status === 'parcial');
    return filteredBuyers.filter(b => b.status === 'resgatado');
  }, [filteredBuyers, statusFilter]);

  // Pagination state (20 itens por página para leveza e rapidez em qualquer PC)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Reset to page 1 when search changes
  const paginatedBuyers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return statusFilteredBuyers.slice(startIndex, startIndex + itemsPerPage);
  }, [statusFilteredBuyers, currentPage]);
  
  const totalPages = Math.ceil(statusFilteredBuyers.length / itemsPerPage);
  
  // Reset page when search term or filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalIngressos = buyers?.reduce((acc, b) => acc + b.num_ingressos, 0) || 0;
  const totalResgatados = buyers?.reduce((acc, b) => acc + b.ingressos_resgatados, 0) || 0;
  
  const stats = {
    total: buyers?.length || 0,
    ingressos: totalIngressos,
    resgatados: totalResgatados,
    pendentes: totalIngressos - totalResgatados, // Ingressos pendentes, não compradores
  };

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <div className="rounded-full bg-muted p-5 inline-block mb-4">
          <Users className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Evento não encontrado</h2>
        <p className="text-muted-foreground mb-6">O evento que você procura não existe ou foi removido.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="font-semibold">Voltar aos Eventos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header with optional background */}
      <div className="relative -mx-4 -mt-8 px-4 pt-8 pb-8 overflow-hidden">
        {/* Background image layer - more visible */}
        {event.background_url && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${event.background_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/90" />
          </>
        )}
        
        <div className="relative z-10 flex flex-col gap-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit font-medium">
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Eventos
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-display-sm gradient-text">{event.name}</h1>
              {event.event_date && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Importar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Importar Compradores</DialogTitle>
                    <DialogDescription>
                      Importe diretamente do Google Sheets ou cole os dados manualmente
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="excel" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="excel" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Arquivo Excel (.xlsx)
                      </TabsTrigger>
                      <TabsTrigger value="sheets" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Link do Sheets
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Colar Dados
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="excel" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Selecione a Planilha (.xlsx, .xls ou .csv)</Label>
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 p-6 bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all text-center">
                          <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                          <p className="text-sm font-semibold mb-1">
                            {excelFileName ? excelFileName : 'Clique para selecionar a planilha do seu computador'}
                          </p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Suporta colunas: NOME, MINISTÉRIOS, TELEFONE, Nº INGRESSOS, DATA, ENTREGA. Linhas repetidas serão agrupadas automaticamente por pessoa.
                          </p>
                          <Input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => handleExcelFileChange(e.target.files?.[0] || null)}
                            className="max-w-xs cursor-pointer"
                          />
                        </div>
                      </div>

                      {isReadingExcel && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Lendo e analisando linhas da planilha...
                        </div>
                      )}

                      {excelAnalysis && <ImportDuplicatesPreview analysis={excelAnalysis} />}

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleImportExcel}
                          disabled={importBuyers.isPending || isReadingExcel || excelBuyers.length === 0}
                        >
                          {importBuyers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {excelBuyers.length > 0 ? `Importar ${excelBuyers.length} Pessoas` : 'Importar'}
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                    
                    <TabsContent value="sheets" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Link da Planilha Google</Label>
                        <Input
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                        <p className="text-xs text-muted-foreground">
                          <strong>Importante:</strong> A planilha precisa estar <strong>Publicada na Web</strong>. 
                          No Google Sheets: Arquivo → Compartilhar → Publicar na web → Publicar.
                          Colunas esperadas: DATA, NOME, CONTATO, Nº INGRESSOS, ENTREGA
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleImportGoogleSheet} 
                          disabled={importFromSheet.isPending || !sheetUrl.trim()}
                        >
                          {importFromSheet.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Importar do Sheets
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                    
                    <TabsContent value="manual" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Dados (cole aqui)</Label>
                        <Textarea
                          value={csvData}
                          onChange={(e) => setCsvData(e.target.value)}
                          placeholder={"NOME\tMINISTÉRIOS\nJoão Silva\tLouvor, Mídia\nMaria Souza\tRecepção"}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole apenas os nomes (um por linha) ou use colunas separadas por TAB com cabeçalho.
                          O sistema reconhece automaticamente as colunas NOME, DATA, CONTATO, Nº INGRESSOS, ENTREGA e MINISTÉRIOS
                          (vários ministérios na mesma célula separados por vírgula).
                        </p>
                      </div>

                      {csvAnalysis && <ImportDuplicatesPreview analysis={csvAnalysis} />}

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleImportCSV}
                          disabled={importBuyers.isPending || !csvAnalysis || (csvAnalysis.unique.length === 0 && csvAnalysis.existingDuplicates.length === 0)}
                        >
                          {importBuyers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {csvAnalysis ? `Importar ${csvAnalysis.unique.length + csvAnalysis.existingDuplicates.length}` : 'Importar'}
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              {/* Aviso: só aparece quando existem nomes repetidos */}
              {duplicateGroups.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsDupCheckOpen(true)}
                  className="gap-2 font-semibold border-warning/50 text-warning-foreground hover:bg-warning/10"
                >
                  <Copy className="h-4 w-4" />
                  {duplicateGroups.length} nome(s) repetido(s)
                </Button>
              )}

              <Button variant="outline" onClick={handleExportClick} className="gap-2 font-semibold" disabled={!buyers?.length}>
                <Download className="h-4 w-4" />
                Exportar
              </Button>

              {/* Verificação/limpeza de nomes repetidos na lista final */}
              <Dialog open={isDupCheckOpen} onOpenChange={setIsDupCheckOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nomes repetidos na lista final</DialogTitle>
                    <DialogDescription>
                      Comparação ignorando acentos e maiúsculas/minúsculas.
                    </DialogDescription>
                  </DialogHeader>
                  {duplicateGroups.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-3 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Nenhum nome repetido encontrado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm font-medium">
                        {duplicateGroups.length} nome(s) repetido(s) — {duplicateExtraCount} registro(s) em excesso.
                      </div>
                      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                        {duplicateGroups.map((g) => (
                          <div
                            key={g.nome}
                            className="flex items-center justify-between rounded border border-border/50 bg-background/80 px-2 py-1.5 text-sm"
                          >
                            <span className="truncate font-medium">{g.nome}</span>
                            <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {g.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => setIsDupCheckOpen(false)}>
                      Fechar
                    </Button>
                    {duplicateGroups.length > 0 && isAdmin && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteDuplicates}
                        disabled={deleteBuyers.isPending}
                      >
                        {deleteBuyers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Apagar {duplicateExtraCount} repetido(s)
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Pergunta na importação quando há repetidos */}
              <Dialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Existem nomes repetidos na importação</DialogTitle>
                    <DialogDescription>
                      {pendingImport?.analysis.internalDuplicates.length || 0} nome(s) repetido(s) dentro da planilha
                      e {pendingImport?.analysis.existingDuplicates.length || 0} nome(s) que já existem na lista.
                      O que deseja fazer?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {pendingImport?.analysis.existingDuplicates.map((b) => (
                      <div
                        key={`e-${b.nome}`}
                        className="flex items-center justify-between rounded border border-border/50 bg-background/80 px-2 py-1.5 text-sm"
                      >
                        <span className="truncate font-medium">{b.nome}</span>
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          já existe
                        </span>
                      </div>
                    ))}
                    {pendingImport?.analysis.internalDuplicates.map((g) => (
                      <div
                        key={`i-${g.nome}`}
                        className="flex items-center justify-between rounded border border-border/50 bg-background/80 px-2 py-1.5 text-sm"
                      >
                        <span className="truncate font-medium">{g.nome}</span>
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {g.count}x na planilha
                        </span>
                      </div>
                    ))}
                  </div>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      variant="outline"
                      disabled={importBuyers.isPending}
                      onClick={() => pendingImport && runImport(pendingImport.source, pendingImport.analysis, false)}
                    >
                      Manter duplicados
                    </Button>
                    <Button
                      disabled={importBuyers.isPending}
                      onClick={() => pendingImport && runImport(pendingImport.source, pendingImport.analysis, true)}
                    >
                      {importBuyers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Remover duplicados
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>



              <AlertDialog open={isWipeOpen} onOpenChange={setIsWipeOpen}>
                <Button 
                  variant="outline" 
                  onClick={() => setIsWipeOpen(true)} 
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold"
                  disabled={!buyers?.length}
                >
                  <Trash2 className="h-4 w-4" />
                  Zerar Lista
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zerar Lista de Compradores?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá apagar <strong>todos os compradores cadastrados neste evento</strong> para que você possa reimportar a lista limpa. Esta ação é irreversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label className="text-xs text-muted-foreground font-medium">Digite ZERAR para confirmar</Label>
                    <Input
                      value={wipeConfirm}
                      onChange={(e) => setWipeConfirm(e.target.value)}
                      placeholder="Digite ZERAR"
                      autoFocus
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setWipeConfirm('')}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleWipeAll}
                      disabled={wipeConfirm !== 'ZERAR' || deleteAllBuyers.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                    >
                      {deleteAllBuyers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Stats with Liquid Glass v4 styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card-featured-v4 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold text-white">{stats.total}</p>
            <p className="text-sm text-white/90 font-medium mt-1">Compradores</p>
          </div>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-700 flex items-center justify-center">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold text-stone-900">{stats.ingressos}</p>
            <p className="text-sm text-stone-700 font-semibold mt-1">Total Ingressos</p>
          </div>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold text-stone-900">{stats.resgatados}</p>
            <p className="text-sm text-stone-700 font-semibold mt-1">Resgatados</p>
          </div>
        </div>

        <div className="bg-white/45 backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-stone-500/15 text-stone-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold text-stone-900">{stats.pendentes}</p>
            <p className="text-sm text-stone-700 font-semibold mt-1">Pendentes</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="compradores" className="w-full space-y-6">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2 bg-card/60 backdrop-blur-md p-1 rounded-2xl border border-border/50">
          <TabsTrigger value="compradores" className="gap-2 font-display font-semibold rounded-xl">
            <Users className="h-4 w-4" />
            Compradores
          </TabsTrigger>
          <TabsTrigger value="ministerios" className="gap-2 font-display font-semibold rounded-xl">
            <Layers className="h-4 w-4" />
            Ministérios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ministerios">
          <MinistryControl buyers={buyers || []} eventName={event.name} eventId={eventId!} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="compradores">
      {/* Buyers Cards Container */}
      <Card className="bg-white/45 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-white/40">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-display font-extrabold text-stone-900">Compradores</CardTitle>
                <CardDescription className="text-sm text-stone-700 font-semibold">
                  Clique no nome do comprador para realizar o resgate rápido
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => updateSearchTerm(e.target.value)}
                  className="pl-10 pr-9 h-11 font-medium bg-white/60 border-white/80 rounded-full text-stone-900 placeholder:text-stone-500 focus:bg-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => updateSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={statusFilter === 'todos' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatusFilter('todos')}
                className={`font-bold rounded-full ${statusFilter === 'todos' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-white/40 border-white/60 text-stone-800 hover:bg-white/70'}`}
              >
                Todos ({filteredBuyers.length})
              </Button>
              <Button 
                variant={statusFilter === 'pendente' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatusFilter('pendente')}
                className={`font-bold rounded-full ${statusFilter === 'pendente' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-white/40 border-white/60 text-stone-800 hover:bg-white/70'}`}
              >
                Pendentes ({filteredBuyers.filter(b => b.status === 'pendente' || b.status === 'parcial').length})
              </Button>
              <Button 
                variant={statusFilter === 'resgatado' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatusFilter('resgatado')}
                className={`font-bold rounded-full ${statusFilter === 'resgatado' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-white/40 border-white/60 text-stone-800 hover:bg-white/70'}`}
              >
                Resgatados ({filteredBuyers.filter(b => b.status === 'resgatado').length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {buyersLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
                <p className="text-sm text-stone-700 font-semibold">Carregando compradores...</p>
              </div>
            </div>
          ) : paginatedBuyers && paginatedBuyers.length > 0 ? (
            <div className="space-y-4">
              {/* Responsive Cards List for Buyers */}
              <div className="grid grid-cols-1 gap-3">
                {paginatedBuyers.map((buyer) => {
                  const initials = buyer.nome
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={buyer.id}
                      onClick={() => handleOpenQuickRedeem(buyer)}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/70 bg-white/45 backdrop-blur-lg shadow-sm hover:shadow-md hover:bg-white/70 hover:border-white transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-white/60 text-orange-950 font-display font-bold text-sm flex items-center justify-center shrink-0 border border-white/80 shadow-sm">
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-stone-900 text-base tracking-tight truncate group-hover:text-orange-600 transition-colors">
                            {buyer.nome}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-700 mt-0.5 font-semibold">
                            {buyer.contato ? (
                              <span className="flex items-center gap-1 text-stone-900 font-bold">
                                📞 {buyer.contato}
                              </span>
                            ) : (
                              <span className="text-stone-500">Sem telefone</span>
                            )}
                            <span>•</span>
                            <span>
                              <strong className="text-stone-900">{buyer.ingressos_resgatados}</strong>/{buyer.num_ingressos} ingressos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Badge + Action link */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                        <StatusBadge status={buyer.status} />

                        <Link
                          to={`/buyer/${buyer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-muted-foreground hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          Histórico →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 border-t border-border/40">
                  <p className="text-sm text-muted-foreground font-medium">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, statusFilteredBuyers.length)} de {statusFilteredBuyers.length} compradores
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl font-semibold"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground font-semibold">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl font-semibold"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-display font-bold text-lg mb-1">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum comprador ainda'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? 'Tente buscar com outros termos'
                  : isAdmin
                  ? 'Importe compradores do Google Sheets ou Excel para começar'
                  : 'Aguarde um administrador importar os compradores'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Redeem Modal */}
      <QuickRedeemModal
        buyer={selectedBuyerForRedeem}
        isOpen={isQuickRedeemOpen}
        onClose={() => setIsQuickRedeemOpen(false)}
      />
    </div>

  );
}
