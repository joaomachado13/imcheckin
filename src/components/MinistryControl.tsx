import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Download,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  UserPlus,
  Phone,
  Building2,
  Loader2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/buyers/importNormalization';
import { toast } from 'sonner';
import type { Buyer } from '@/types/database';
import { buildMinistryStats, belongsToMinistry } from '@/lib/import/ministries';
import { normalizeSearchText } from '@/lib/search/normalize';

interface Props {
  buyers: Buyer[];
  eventName: string;
  eventId: string;
  isAdmin: boolean;
}

// ---------- Mutations ----------

function useAddNaoCadastrado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      nome,
      contato,
      ministerios,
    }: {
      eventId: string;
      nome: string;
      contato: string;
      ministerios: string[];
    }) => {
      const { data, error } = await supabase
        .from('buyers')
        .insert({
          event_id: eventId,
          nome: nome.trim(),
          contato: contato.trim() || null,
          contato_normalizado: normalizePhone(contato) || null,
          ministerios,
          num_ingressos: 1,
          ingressos_resgatados: 0,
          status: 'pendente',
          entrega: 'nao_cadastrado', // Marcador: pessoa adicionada manualmente, aguardando confirmacao
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      toast.success('Pessoa adicionada. Confirme a participacao dela na lista abaixo.');
    },
    onError: () => toast.error('Erro ao adicionar pessoa. Tente novamente.'),
  });
}

function useConfirmNaoCadastrado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ buyerId, eventId }: { buyerId: string; eventId: string }) => {
      const { error } = await supabase
        .from('buyers')
        .update({ entrega: null }) // Remove marcador -> entra na lista normal
        .eq('id', buyerId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      toast.success('Participacao confirmada! Pessoa adicionada a lista.');
    },
    onError: () => toast.error('Erro ao confirmar participacao.'),
  });
}

function useRemoveNaoCadastrado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ buyerId, eventId }: { buyerId: string; eventId: string }) => {
      const { error } = await supabase.from('buyers').delete().eq('id', buyerId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      toast.success('Registro removido.');
    },
    onError: () => toast.error('Erro ao remover registro.'),
  });
}

// ---------- Sub-componentes ----------

const MINISTERIOS_PADRAO = [
  'Louvor', 'Midia', 'Recepcao', 'Seguranca', 'Infantil',
  'Intercessao', 'Diaconia', 'Comunicacao', 'Lideranca', 'Jovens',
];

function FormNaoCadastrado({
  eventId,
  ministeriosExistentes,
}: {
  eventId: string;
  ministeriosExistentes: string[];
}) {
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [ministeriosSel, setMinisteriosSel] = useState<string[]>([]);
  const [outro, setOutro] = useState('');
  const add = useAddNaoCadastrado();

  const lista = ministeriosExistentes.length > 0 ? ministeriosExistentes : MINISTERIOS_PADRAO;

  const toggle = (m: string) =>
    setMinisteriosSel((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome da pessoa.'); return; }
    const mins = [...ministeriosSel];
    if (outro.trim()) mins.push(outro.trim());
    await add.mutateAsync({ eventId, nome, contato, ministerios: mins });
    setNome('');
    setContato('');
    setMinisteriosSel([]);
    setOutro('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm flex gap-2 items-start">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span className="text-muted-foreground">
          Use este formulario para adicionar pessoas que <strong className="text-foreground">nao estavam na lista importada</strong>.
          Elas ficam separadas ate voce confirmar a participacao.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="nc-nome" className="font-semibold flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Nome completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nc-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            required
            className="h-11"
          />
        </div>

        {/* Telefone */}
        <div className="space-y-1.5">
          <Label htmlFor="nc-tel" className="font-semibold flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Telefone / WhatsApp
          </Label>
          <Input
            id="nc-tel"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder="(00) 00000-0000"
            type="tel"
            className="h-11"
          />
        </div>
      </div>

      {/* Ministerios */}
      <div className="space-y-2">
        <Label className="font-semibold flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          Ministerio(s)
        </Label>
        <div className="flex flex-wrap gap-2">
          {lista.map((m) => {
            const sel = ministeriosSel.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggle(m)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  sel
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/60 bg-background hover:bg-muted/60'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        <Input
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Outro ministerio..."
          className="h-9 text-sm mt-1"
        />
      </div>

      <Button type="submit" className="gap-2 font-bold" disabled={add.isPending || !nome.trim()}>
        {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {add.isPending ? 'Adicionando...' : 'Adicionar Pessoa'}
      </Button>
    </form>
  );
}

function ListaNaoCadastrados({
  naoCadastrados,
  eventId,
}: {
  naoCadastrados: Buyer[];
  eventId: string;
}) {
  const confirm = useConfirmNaoCadastrado();
  const remove = useRemoveNaoCadastrado();

  if (naoCadastrados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <CheckCircle2 className="h-10 w-10 text-success opacity-50" />
        <p className="text-sm text-muted-foreground font-medium">
          Nenhuma pessoa aguardando confirmacao.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
        <Clock className="h-4 w-4 text-warning shrink-0" />
        <p className="text-sm font-semibold text-warning-foreground">
          {naoCadastrados.length}{' '}
          {naoCadastrados.length === 1 ? 'pessoa aguardando' : 'pessoas aguardando'} confirmacao
        </p>
      </div>

      <div className="space-y-2">
        {naoCadastrados.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-semibold text-sm truncate">{b.nome}</p>
              {b.contato && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {b.contato}
                </p>
              )}
              {b.ministerios && b.ministerios.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {b.ministerios.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground gap-1"
                onClick={() => confirm.mutate({ buyerId: b.id, eventId })}
                disabled={confirm.isPending || remove.isPending}
              >
                {confirm.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => remove.mutate({ buyerId: b.id, eventId })}
                disabled={confirm.isPending || remove.isPending}
              >
                {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Componente principal ----------

export function MinistryControl({ buyers, eventName, eventId, isAdmin }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [naoCadMinisterio, setNaoCadMinisterio] = useState<string>('todos');

  // Separa os nao cadastrados (marcador especial) dos cadastrados normais
  const naoCadastrados = useMemo(
    () => buyers.filter((b) => b.entrega === 'nao_cadastrado'),
    [buyers]
  );
  const cadastrados = useMemo(
    () => buyers.filter((b) => b.entrega !== 'nao_cadastrado'),
    [buyers]
  );

  const stats = useMemo(() => buildMinistryStats(cadastrados), [cadastrados]);

  // Ministerios existentes para sugerir no formulario
  const ministeriosExistentes = useMemo(() => {
    const set = new Set<string>();
    buyers.forEach((b) => (b.ministerios || []).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [buyers]);

  const filteredStats = useMemo(() => {
    const q = normalizeSearchText(search);
    if (!q) return stats;
    return stats.filter((s) => normalizeSearchText(s.label).includes(q));
  }, [stats, search]);

  const selectedStat = stats.find((s) => s.key === selected) || null;
  const selectedBuyers = useMemo(() => {
    if (!selected) return [];
    return cadastrados
      .filter((b) => belongsToMinistry(b, selected))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cadastrados, selected]);

  const exportPendentes = () => {
    if (!selectedStat) return;
    const rows = selectedBuyers
      .filter((b) => b.status !== 'resgatado')
      .map((b) => ({
        Nome: b.nome,
        Contato: b.contato || '',
        'Ministerios': (b.ministerios || []).join(', '),
        Ingressos: b.num_ingressos,
        Retirados: b.ingressos_resgatados,
        Status: b.status,
      }));
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendentes');
    const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `${safe(eventName)}_${safe(selectedStat.label)}_pendentes.xlsx`);
  };

  // ---- Nao cadastrados: filtro por ministerio + exportacao para os lideres ----
  const ministeriosNaoCadastrados = useMemo(() => {
    const set = new Set<string>();
    naoCadastrados.forEach((b) => (b.ministerios || []).forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [naoCadastrados]);

  const naoCadastradosFiltrados = useMemo(() => {
    if (naoCadMinisterio === 'todos') return naoCadastrados;
    if (naoCadMinisterio === '__sem__')
      return naoCadastrados.filter((b) => (b.ministerios || []).length === 0);
    return naoCadastrados.filter((b) => belongsToMinistry(b, naoCadMinisterio));
  }, [naoCadastrados, naoCadMinisterio]);

  const exportNaoCadastrados = () => {
    const rows = [...naoCadastradosFiltrados]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((b) => ({
        Nome: b.nome,
        Contato: b.contato || '',
        Ministerios: (b.ministerios || []).join(', '),
        'Adicionado em': new Date(b.created_at).toLocaleDateString('pt-BR'),
        'Confere? (Sim/Nao)': '',
        'Observacao do lider': '',
      }));
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 32 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nao cadastrados');
    const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '_');
    const sufixo =
      naoCadMinisterio === 'todos'
        ? 'todos'
        : naoCadMinisterio === '__sem__'
          ? 'sem_ministerio'
          : safe(naoCadMinisterio);
    XLSX.writeFile(wb, `${safe(eventName)}_nao_cadastrados_${sufixo}.xlsx`);
  };



  return (
    <div className="space-y-6">
      <Tabs defaultValue="ministerios">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
          <TabsTrigger value="ministerios" className="gap-2">
            <Layers className="h-4 w-4" />
            Por Ministerio
          </TabsTrigger>
          <TabsTrigger value="nao-cadastrados" className="gap-2 relative">
            <UserPlus className="h-4 w-4" />
            Nao Cadastrados
            {naoCadastrados.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[9px] font-bold flex items-center justify-center">
                {naoCadastrados.length > 9 ? '9+' : naoCadastrados.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- ABA: MINISTERIOS ---- */}
        <TabsContent value="ministerios" className="mt-6">
          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Controle por Ministerios</CardTitle>
                  <CardDescription className="text-base">
                    Clique em um ministerio para ver os detalhes e exportar pendentes
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ministerio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 font-medium"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats.length === 0 ? (
                <div className="text-center py-16">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-1">Nenhum ministerio cadastrado</h3>
                  <p className="text-sm text-muted-foreground">
                    Importe a lista com uma coluna MINISTERIOS para ver o controle por equipe.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStats.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelected(s.key)}
                      className="text-left rounded-xl border border-border/60 bg-card p-5 hover:border-primary/50 hover:shadow-card transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="font-display font-bold text-lg leading-tight">{s.label}</h3>
                        <span className="shrink-0 text-sm font-bold text-primary">{s.percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                        <div className="h-full bg-primary transition-all" style={{ width: `${s.percent}%` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-medium">
                            <Users className="h-3 w-3" /> Total
                          </p>
                          <p className="text-xl font-bold">{s.total}</p>
                        </div>
                        <div>
                          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Retirados
                          </p>
                          <p className="text-xl font-bold text-success">{s.retirados}</p>
                        </div>
                        <div>
                          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-medium">
                            <Clock className="h-3 w-3" /> Pendentes
                          </p>
                          <p className="text-xl font-bold text-pending">{s.pendentes}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- ABA: NAO CADASTRADOS ---- */}
        <TabsContent value="nao-cadastrados" className="mt-6">
          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Nao Cadastrados
              </CardTitle>
              <CardDescription className="text-base">
                Adicione pessoas que nao estavam na lista importada. Confirme a participacao depois.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Formulario de adicao */}
              <div className="border border-border/50 rounded-xl p-5 bg-muted/10">
                <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Adicionar pessoa
                </h4>
                <FormNaoCadastrado eventId={eventId} ministeriosExistentes={ministeriosExistentes} />
              </div>

              {/* Lista de aguardando confirmacao */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    Aguardando confirmacao
                    <span className="text-muted-foreground font-normal">
                      ({naoCadastradosFiltrados.length})
                    </span>
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={naoCadMinisterio} onValueChange={setNaoCadMinisterio}>
                      <SelectTrigger className="w-full sm:w-56 h-10 font-medium">
                        <SelectValue placeholder="Filtrar por ministerio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os ministerios</SelectItem>
                        <SelectItem value="__sem__">Sem ministerio</SelectItem>
                        {ministeriosNaoCadastrados.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={exportNaoCadastrados}
                      disabled={naoCadastradosFiltrados.length === 0}
                      className="gap-2 font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      Exportar relatorio
                    </Button>
                  </div>
                </div>
                <ListaNaoCadastrados naoCadastrados={naoCadastradosFiltrados} eventId={eventId} />
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes do ministerio */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedStat?.label}</DialogTitle>
            <DialogDescription>
              {selectedStat &&
                `${selectedStat.total} participantes · ${selectedStat.retirados} retirados · ${selectedStat.pendentes} pendentes (${selectedStat.percent}%)`}
            </DialogDescription>
          </DialogHeader>

          {isAdmin && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={exportPendentes}
                disabled={!selectedStat || selectedStat.pendentes === 0}
                className="gap-2 font-semibold"
              >
                <Download className="h-4 w-4" />
                Exportar pendentes
              </Button>
            </div>
          )}

          <div className="table-premium max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="text-center font-bold">Ingressos</TableHead>
                  <TableHead className="text-center font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBuyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold">{b.nome}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold">{b.ingressos_resgatados}</span>
                      <span className="text-muted-foreground">/{b.num_ingressos}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/buyer/${b.id}`}>
                        <Button variant="ghost" size="sm" className="font-semibold">
                          Detalhes
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
