import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useConferences, useCreateConference, useUpdateConference, useDeleteConference,
  useVolunteers, useImportVolunteers, useVolunteerRedemptions,
  useCreateVolunteerRedemption, useUndoVolunteerRedemption, useRemoveVolunteer,
  useDeleteAllVolunteers,
} from '@/hooks/useVolunteers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users, Upload, Search, Loader2, CheckCircle2, Clock, Plus, Trash2, Settings, Ticket, Undo2, X, AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeSearchText } from '@/lib/search/normalize';
import { analyzeImportDuplicates, type DuplicateAnalysis } from '@/lib/import/duplicates';
import { ImportDuplicatesPreview } from '@/components/ImportDuplicatesPreview';
import { parseExcelFile, groupAndMergeBuyers } from '@/lib/import/excelParser';

export default function Volunteers() {
  const { user, profile, isAdmin } = useAuth();
  const { data: conferences, isLoading: confLoading } = useConferences();
  const { data: volunteers, isLoading: volLoading } = useVolunteers();
  const { data: redemptions } = useVolunteerRedemptions();
  const importVolunteers = useImportVolunteers();
  const createRedemption = useCreateVolunteerRedemption();
  const undoRedemption = useUndoVolunteerRedemption();
  const removeVolunteer = useRemoveVolunteer();
  const createConference = useCreateConference();
  const updateConference = useUpdateConference();
  const deleteConference = useDeleteConference();
  const deleteAllVolunteers = useDeleteAllVolunteers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'resgatado'>('todos');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isConfOpen, setIsConfOpen] = useState(false);
  const [newConfName, setNewConfName] = useState('');
  const [isWipeOpen, setIsWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState('');

  // Redemption dialog state
  const [redeemVolunteer, setRedeemVolunteer] = useState<{ id: string; nome: string } | null>(null);
  const [selectedConference, setSelectedConference] = useState('');

  // Undo dialog state
  const [undoTarget, setUndoTarget] = useState<{ id: string; nome: string } | null>(null);
  const [undoJustificativa, setUndoJustificativa] = useState('');

  // Remove dialog
  const [removeTarget, setRemoveTarget] = useState<{ id: string; nome: string } | null>(null);
  const [removeMotivo, setRemoveMotivo] = useState('');

  // Build redemption map: volunteer_id -> redemption
  const redemptionMap = useMemo(() => {
    const map = new Map<string, typeof redemptions extends (infer T)[] | undefined ? T : never>();
    redemptions?.forEach((r) => map.set(r.volunteer_id, r));
    return map;
  }, [redemptions]);

  // Conference map
  const conferenceMap = useMemo(() => {
    const map = new Map<string, string>();
    conferences?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [conferences]);

  const activeConferences = useMemo(() => conferences?.filter(c => c.active) || [], [conferences]);

  // Filter volunteers — busca normalizada (sem acento, case-insensitive)
  const filtered = useMemo(() => {
    if (!volunteers) return [];
    let list = volunteers;
    if (searchTerm.trim()) {
      const normName = normalizeSearchText(searchTerm);
      const digits = searchTerm.replace(/\D/g, '');
      list = list.filter((v) => {
        const nameMatch = normName ? normalizeSearchText(v.nome).includes(normName) : false;
        const phoneMatch = digits.length >= 3 && v.contato_normalizado?.includes(digits);
        return nameMatch || phoneMatch;
      });
    }
    if (statusFilter === 'pendente') list = list.filter(v => !redemptionMap.has(v.id));
    if (statusFilter === 'resgatado') list = list.filter(v => redemptionMap.has(v.id));
    return list;
  }, [volunteers, searchTerm, statusFilter, redemptionMap]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 50;
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * perPage, currentPage * perPage), [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / perPage);
  useMemo(() => setCurrentPage(1), [searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = volunteers?.length || 0;
    const resgatados = redemptions?.length || 0;
    return { total, resgatados, pendentes: total - resgatados };
  }, [volunteers, redemptions]);

  const parseVolunteersCsv = (raw: string): Array<{ nome: string }> => {
    const lines = raw.trim().split('\n');
    if (lines.length === 0) return [];
    const startIdx = /nome|name/i.test(lines[0]) ? 1 : 0;
    const parsed: Array<{ nome: string }> = [];
    for (let i = startIdx; i < lines.length; i++) {
      const nome = lines[i].split('\t')[0]?.trim();
      if (nome) parsed.push({ nome });
    }
    return parsed;
  };

  const csvAnalysis = useMemo<DuplicateAnalysis<{ nome: string }> | null>(() => {
    if (!csvData.trim()) return null;
    const parsed = parseVolunteersCsv(csvData);
    if (parsed.length === 0) return null;
    const existingNames = (volunteers || []).map((v) => v.nome);
    return analyzeImportDuplicates(parsed, existingNames);
  }, [csvData, volunteers]);

  const handleImport = async () => {
    if (!csvData.trim()) return;
    const parsed = parseVolunteersCsv(csvData);
    const existingNames = (volunteers || []).map((v) => v.nome);
    const analysis = analyzeImportDuplicates(parsed, existingNames);
    if (analysis.unique.length > 0) {
      await importVolunteers.mutateAsync(analysis.unique);
      setCsvData('');
      setIsImportOpen(false);
    }
  };

  const handleWipeAll = async () => {
    await deleteAllVolunteers.mutateAsync();
    setIsWipeOpen(false);
    setWipeConfirm('');
  };

  const handleRedeem = async () => {
    if (!redeemVolunteer || !selectedConference || !user) return;
    await createRedemption.mutateAsync({
      volunteer_id: redeemVolunteer.id,
      conference_id: selectedConference,
      operador_id: user.id,
      operador_nome: profile?.full_name || user.email || undefined,
    });
    setRedeemVolunteer(null);
    setSelectedConference('');
  };

  const handleUndo = async () => {
    if (!undoTarget || !user || !undoJustificativa.trim()) return;
    const redemption = redemptionMap.get(undoTarget.id);
    if (!redemption) return;
    await undoRedemption.mutateAsync({ id: redemption.id, userId: user.id, justificativa: undoJustificativa });
    setUndoTarget(null);
    setUndoJustificativa('');
  };

  const handleRemove = async () => {
    if (!removeTarget || !user || !removeMotivo) return;
    await removeVolunteer.mutateAsync({ volunteerId: removeTarget.id, motivo: removeMotivo, userId: user.id });
    setRemoveTarget(null);
    setRemoveMotivo('');
  };

  const handleAddConference = async () => {
    if (!newConfName.trim()) return;
    const maxOrder = conferences?.reduce((max, c) => Math.max(max, c.sort_order), 0) || 0;
    await createConference.mutateAsync({ name: newConfName.trim(), sort_order: maxOrder + 1 });
    setNewConfName('');
  };

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportConfId, setExportConfId] = useState('');

  const exportExcel = () => {
    if (!volunteers || !isAdmin || !exportConfId) return;
    const confName = conferenceMap.get(exportConfId) || 'Conferência';
    // Filter only volunteers who redeemed THIS specific conference
    const rows = volunteers
      .filter((v) => {
        const r = redemptionMap.get(v.id);
        return r && r.conference_id === exportConfId;
      })
      .map((v) => {
        const r = redemptionMap.get(v.id)!;
        return {
          'Nome': v.nome,
          'Data/Hora Resgate': new Date(r.created_at).toLocaleString('pt-BR'),
          'Operador': r.operador_nome || '',
        };
      });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    const safeSheet = confName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Conferência';
    XLSX.utils.book_append_sheet(wb, ws, safeSheet);
    const safeFile = confName.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
    XLSX.writeFile(wb, `voluntarios_${safeFile || 'conferencia'}.xlsx`);
    setIsExportOpen(false);
    setExportConfId('');
  };

  if (volLoading || confLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm gradient-text">Voluntários</h1>
          <p className="text-muted-foreground mt-1">Lista oficial de voluntários da igreja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <AlertDialog open={isWipeOpen} onOpenChange={(o) => { setIsWipeOpen(o); if (!o) setWipeConfirm(''); }}>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setIsWipeOpen(true)}
                  disabled={!volunteers?.length}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Zerar lista
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zerar lista de voluntários?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá <strong>apagar permanentemente todos os {stats.total} voluntários</strong> e todos os resgates associados. Esta operação não pode ser desfeita.
                      <br /><br />
                      Para confirmar, digite <strong>ZERAR</strong> abaixo:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={wipeConfirm}
                    onChange={(e) => setWipeConfirm(e.target.value)}
                    placeholder="Digite ZERAR"
                    autoFocus
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleWipeAll}
                      disabled={wipeConfirm !== 'ZERAR' || deleteAllVolunteers.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteAllVolunteers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />Importar manual</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Importar Voluntários (manual)</DialogTitle>
                    <DialogDescription>Cole os nomes (um por linha). Para sincronização ao vivo, use o botão "Atualizar agora".</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder={"NOME\nJoão Silva\nMaria Souza\nPedro Lima"}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Um nome por linha. Se a primeira linha for "NOME", será ignorada.</p>
                  </div>

                  {csvAnalysis && <ImportDuplicatesPreview analysis={csvAnalysis} />}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={handleImport}
                      disabled={importVolunteers.isPending || !csvAnalysis || csvAnalysis.unique.length === 0}
                    >
                      {importVolunteers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {csvAnalysis ? `Importar ${csvAnalysis.unique.length}` : 'Importar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isConfOpen} onOpenChange={setIsConfOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" />Conferências</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gerenciar Conferências</DialogTitle>
                    <DialogDescription>Adicione, ative ou desative conferências disponíveis</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conferences?.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                        <span className={`flex-1 text-sm font-medium ${!c.active ? 'line-through text-muted-foreground' : ''}`}>{c.name}</span>
                        <Button size="sm" variant={c.active ? 'secondary' : 'outline'} onClick={() => updateConference.mutate({ id: c.id, active: !c.active })}>
                          {c.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteConference.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={newConfName} onChange={(e) => setNewConfName(e.target.value)} placeholder="Nova conferência..." className="flex-1" />
                    <Button onClick={handleAddConference} disabled={!newConfName.trim() || createConference.isPending}>
                      <Plus className="h-4 w-4 mr-1" />Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isExportOpen} onOpenChange={(o) => { setIsExportOpen(o); if (!o) setExportConfId(''); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={!volunteers?.length}>
                    <Ticket className="h-4 w-4" />Exportar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Exportar por Conferência</DialogTitle>
                    <DialogDescription>
                      Selecione a conferência. O relatório terá apenas os nomes de quem escolheu essa conferência.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label>Conferência</Label>
                    <Select value={exportConfId} onValueChange={setExportConfId}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma conferência..." /></SelectTrigger>
                      <SelectContent>
                        {conferences?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancelar</Button>
                    <Button onClick={exportExcel} disabled={!exportConfId}>Baixar planilha</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-3xl font-display font-extrabold">{stats.total}</p>
              <p className="text-sm text-muted-foreground font-medium">Voluntários</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10"><CheckCircle2 className="h-6 w-6 text-success" /></div>
            <div>
              <p className="text-3xl font-display font-extrabold">{stats.resgatados}</p>
              <p className="text-sm text-muted-foreground font-medium">Resgatados</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pending/10"><Clock className="h-6 w-6 text-pending" /></div>
            <div>
              <p className="text-3xl font-display font-extrabold">{stats.pendentes}</p>
              <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Volunteer list */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <CardTitle className="font-display text-xl">Lista de Voluntários</CardTitle>
              <div className="relative flex-1 max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={statusFilter === 'todos' ? 'default' : 'outline'} onClick={() => setStatusFilter('todos')}>
                Todos ({stats.total})
              </Button>
              <Button size="sm" variant={statusFilter === 'pendente' ? 'default' : 'outline'} onClick={() => setStatusFilter('pendente')}>
                Pendentes ({stats.pendentes})
              </Button>
              <Button size="sm" variant={statusFilter === 'resgatado' ? 'default' : 'outline'} onClick={() => setStatusFilter('resgatado')}>
                Resgatados ({stats.resgatados})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginated.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                {volunteers?.length === 0 ? 'Nenhum voluntário importado ainda' : 'Nenhum resultado encontrado'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Conferência</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((vol) => {
                      const redemption = redemptionMap.get(vol.id);
                      const hasRedeemed = !!redemption;
                      return (
                        <TableRow key={vol.id}>
                          <TableCell className="font-medium">{vol.nome}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${hasRedeemed ? 'bg-success/10 text-success' : 'bg-pending/10 text-pending'}`}>
                              {hasRedeemed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {hasRedeemed ? 'Resgatado' : 'Pendente'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {hasRedeemed ? conferenceMap.get(redemption!.conference_id) || '—' : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {!hasRedeemed ? (
                                <Button size="sm" className="gap-1" onClick={() => { setRedeemVolunteer({ id: vol.id, nome: vol.nome }); setSelectedConference(''); }}>
                                  <Ticket className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Resgatar</span>
                                </Button>
                              ) : isAdmin ? (
                                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setUndoTarget({ id: vol.id, nome: vol.nome }); setUndoJustificativa(''); }}>
                                  <Undo2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => { setRemoveTarget({ id: vol.id, nome: vol.nome }); setRemoveMotivo(''); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Anterior</Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Próximo</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Redeem Dialog */}
      <Dialog open={!!redeemVolunteer} onOpenChange={(o) => !o && setRedeemVolunteer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar Conferência</DialogTitle>
            <DialogDescription>
              Escolha a conferência para <strong>{redeemVolunteer?.nome}</strong>. Cada voluntário pode resgatar apenas 1 conferência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Conferência</Label>
            <Select value={selectedConference} onValueChange={setSelectedConference}>
              <SelectTrigger><SelectValue placeholder="Selecione uma conferência..." /></SelectTrigger>
              <SelectContent>
                {activeConferences.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemVolunteer(null)}>Cancelar</Button>
            <Button onClick={handleRedeem} disabled={!selectedConference || createRedemption.isPending}>
              {createRedemption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Dialog */}
      <AlertDialog open={!!undoTarget} onOpenChange={(o) => !o && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Resgate</AlertDialogTitle>
            <AlertDialogDescription>
              Desfazer o resgate de <strong>{undoTarget?.nome}</strong>? Informe a justificativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={undoJustificativa} onChange={(e) => setUndoJustificativa(e.target.value)} placeholder="Motivo..." />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndo} disabled={!undoJustificativa.trim() || undoRedemption.isPending}>
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Voluntário</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{removeTarget?.nome}</strong> da lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={removeMotivo} onValueChange={setRemoveMotivo}>
            <SelectTrigger><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Duplicado">Duplicado</SelectItem>
              <SelectItem value="Erro de importação">Erro de importação</SelectItem>
              <SelectItem value="Cancelamento">Cancelamento</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={!removeMotivo || removeVolunteer.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
