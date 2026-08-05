import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, useCreateEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Trash2,
  Users,
  ChevronRight,
  Loader2,
  Image,
  Settings2,
  Upload,
  CalendarDays,
  Ticket,
  CheckCircle,
  QrCode,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '@/types/database';
import { cn } from '@/lib/utils';

type EventStatus = 'ativo' | 'preparacao' | 'encerrado';

const statusStyles: Record<EventStatus, { label: string; className: string; dot: string }> = {
  ativo: {
    label: 'Ativo',
    className: 'bg-success/10 text-success border-success/25',
    dot: 'bg-success',
  },
  preparacao: {
    label: 'Em preparação',
    className: 'bg-warning/15 text-warning-foreground border-warning/30',
    dot: 'bg-warning',
  },
  encerrado: {
    label: 'Encerrado',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

function getEventStatus(event: Event): EventStatus {
  if (!event.event_date) return 'ativo';
  const date = new Date(event.event_date);
  if (isToday(date)) return 'ativo';
  return isAfter(date, startOfDay(new Date())) ? 'preparacao' : 'encerrado';
}

const nf = new Intl.NumberFormat('pt-BR');

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth();
  const { data: events, isLoading } = useEvents();
  const { data: stats } = useDashboardStats();
  const { data: activity } = useRecentActivity();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputCreate = useRef<HTMLInputElement>(null);
  const fileInputEdit = useRef<HTMLInputElement>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    event_date: '',
    description: '',
    background_url: '',
  });

  const firstName = (profile?.full_name || user?.email || '').split(/[\s@]/)[0] || 'bem-vindo';
  const initials = (profile?.full_name || user?.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const grouped = useMemo(() => {
    const upcoming: Event[] = [];
    const active: Event[] = [];
    const ended: Event[] = [];
    for (const e of events || []) {
      const status = getEventStatus(e);
      if (status === 'preparacao') upcoming.push(e);
      else if (status === 'encerrado') ended.push(e);
      else active.push(e);
    }
    return { upcoming, active, ended };
  }, [events]);

  const uploadBackground = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem (PNG, JPG ou WEBP)');
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return null;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('event-backgrounds')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('event-backgrounds').getPublicUrl(fileName);
      toast.success('Imagem enviada!');
      return data.publicUrl;
    } catch (e: any) {
      toast.error('Erro ao enviar imagem: ' + e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await createEvent.mutateAsync({
      ...newEvent,
      event_date: newEvent.event_date || undefined,
      description: newEvent.description || undefined,
      background_url: newEvent.background_url || undefined,
      created_by: user.id,
    });

    setNewEvent({ name: '', event_date: '', description: '', background_url: '' });
    setIsCreateOpen(false);
  };

  const handleUpdateBackground = async (eventId: string) => {
    await updateEvent.mutateAsync({
      id: eventId,
      background_url: backgroundUrl || null,
    });
    setEditingEvent(null);
    setBackgroundUrl('');
  };

  const kpis = [
    {
      icon: CalendarDays,
      label: 'Eventos ativos',
      value: nf.format((grouped.active.length || 0) + grouped.upcoming.length),
      hint: `${events?.length || 0} no total`,
    },
    {
      icon: Ticket,
      label: 'Ingressos emitidos',
      value: nf.format(stats?.totals.ingressos ?? 0),
      hint: 'Somando todos os eventos',
    },
    {
      icon: CheckCircle,
      label: 'Resgates realizados',
      value: nf.format(stats?.totals.resgatados ?? 0),
      hint: `${nf.format(stats?.totals.pendentes ?? 0)} pendentes`,
    },
    {
      icon: QrCode,
      label: 'Check-ins hoje',
      value: nf.format(stats?.checkinsToday ?? 0),
      hint: 'Atualizado em tempo real',
    },
  ];

  const renderEventCard = (event: Event) => {
    const status = getEventStatus(event);
    const style = statusStyles[status];
    const s = stats?.byEvent[event.id];
    const date = event.event_date ? new Date(event.event_date) : null;

    return (
      <Card
        key={event.id}
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        {/* Banner */}
        <div className="relative h-32 sm:h-36 overflow-hidden bg-secondary">
          {event.background_url ? (
            <img
              src={event.background_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full gradient-primary opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />

          <span
            className={cn(
              'absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md',
              style.className
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
            {style.label}
          </span>

          {isAdmin && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Dialog
                open={editingEvent === event.id}
                onOpenChange={(open) => {
                  setEditingEvent(open ? event.id : null);
                  if (open) setBackgroundUrl(event.background_url || '');
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Configurar imagem de ${event.name}`}
                    className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur-md"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Background</DialogTitle>
                    <DialogDescription>
                      Adicione uma imagem de fundo para destacar este evento
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <input
                      ref={fileInputEdit}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadBackground(file);
                        if (url) setBackgroundUrl(url);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputEdit.current?.click()}
                      disabled={uploading}
                      className="w-full h-11 gap-2"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {backgroundUrl ? 'Trocar imagem' : 'Escolher arquivo do computador'}
                    </Button>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ou colar URL
                      </summary>
                      <Input
                        id="bg-url"
                        value={backgroundUrl}
                        onChange={(e) => setBackgroundUrl(e.target.value)}
                        placeholder="https://exemplo.com/imagem.png"
                        className="h-10 mt-2"
                      />
                    </details>
                    {backgroundUrl && (
                      <div className="rounded-lg overflow-hidden border aspect-video bg-muted">
                        <img
                          src={backgroundUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingEvent(null)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => handleUpdateBackground(event.id)}
                      disabled={updateEvent.isPending}
                      className="btn-premium text-primary-foreground"
                    >
                      {updateEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Excluir ${event.name}`}
                    className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur-md hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os compradores e resgates associados
                      também serão excluídos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteEvent.mutate(event.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <CardContent className="p-5 pt-4 space-y-4">
          <div className="flex items-start gap-3">
            {date && (
              <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-center leading-none">
                <p className="font-display text-lg font-extrabold text-primary">
                  {format(date, 'dd')}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary/80 mt-0.5">
                  {format(date, 'MMM', { locale: ptBR })}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  {format(date, 'yyyy')}
                </p>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {event.name}
              </h3>
              {event.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Ingressos
              </dt>
              <dd className="font-display text-base font-extrabold text-foreground">
                {nf.format(s?.ingressos ?? 0)}
              </dd>
            </div>
            <div className="border-x border-border/60">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Resgatados
              </dt>
              <dd className="font-display text-base font-extrabold text-success">
                {nf.format(s?.resgatados ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Pendentes
              </dt>
              <dd className="font-display text-base font-extrabold text-primary">
                {nf.format(s?.pendentes ?? 0)}
              </dd>
            </div>
          </dl>

          <Button asChild className="btn-premium w-full h-10 rounded-xl font-bold text-sm">
            <Link to={`/event/${event.id}`}>
              Abrir Evento
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title: string, list: Event[]) =>
    list.length > 0 ? (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
          <span className="text-xs font-semibold text-muted-foreground">{list.length}</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">{list.map(renderEventCard)}</div>
      </section>
    ) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Saudação */}
      <header className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/25">
              <AvatarFallback className="gradient-primary text-primary-foreground font-display font-extrabold">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight capitalize">
                Olá, {firstName} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Bem-vindo ao im.CHECK-IN — gerencie eventos, ingressos, resgates e check-ins em
                tempo real.
              </p>
            </div>
          </div>

          {isAdmin && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="btn-premium gap-2 px-5 h-11 rounded-xl text-sm font-bold shrink-0">
                  <Plus className="h-4 w-4" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <form onSubmit={handleCreateEvent}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Criar Novo Evento</DialogTitle>
                    <DialogDescription>
                      Preencha as informações do evento. Depois você poderá importar os compradores.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-semibold">
                        Nome do Evento *
                      </Label>
                      <Input
                        id="name"
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                        placeholder="Ex: Conferência 2025"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event_date" className="font-semibold">
                        Data do Evento
                      </Label>
                      <Input
                        id="event_date"
                        type="date"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-semibold">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Detalhes adicionais sobre o evento..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="background_url" className="font-semibold flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Imagem de Fundo
                      </Label>
                      <input
                        ref={fileInputCreate}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await uploadBackground(file);
                          if (url) setNewEvent({ ...newEvent, background_url: url });
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputCreate.current?.click()}
                        disabled={uploading}
                        className="w-full h-11 gap-2"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {newEvent.background_url ? 'Trocar imagem' : 'Escolher arquivo do computador'}
                      </Button>
                      {newEvent.background_url && (
                        <div className="rounded-lg overflow-hidden border aspect-video bg-muted">
                          <img
                            src={newEvent.background_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ou colar URL
                        </summary>
                        <Input
                          value={newEvent.background_url}
                          onChange={(e) => setNewEvent({ ...newEvent, background_url: e.target.value })}
                          placeholder="https://exemplo.com/imagem.png"
                          className="h-10 mt-2"
                        />
                      </details>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createEvent.isPending}
                      className="btn-premium text-primary-foreground"
                    >
                      {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Evento
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* KPIs */}
      <section aria-label="Indicadores" className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, hint }) => (
          <div
            key={label}
            className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="font-display text-3xl font-extrabold tracking-tight mt-4">{value}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          </div>
        ))}
      </section>

      {/* Eventos + Atividades */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {renderSection('Próximos eventos', grouped.upcoming)}
          {renderSection('Eventos ativos', grouped.active)}
          {renderSection('Eventos encerrados', grouped.ended)}

          {(!events || events.length === 0) && (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-primary/10 p-5 mb-6">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">Nenhum evento ainda</h3>
                <p className="text-muted-foreground text-base mb-6 max-w-sm">
                  {isAdmin
                    ? 'Crie seu primeiro evento para começar a gerenciar ingressos.'
                    : 'Aguarde um administrador criar eventos.'}
                </p>
                {isAdmin && (
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn-premium text-primary-foreground gap-2 px-8 h-12 text-base font-bold"
                  >
                    <Plus className="h-5 w-5" />
                    Criar Primeiro Evento
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Atividades recentes */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="font-display text-base font-bold tracking-tight">Atividades recentes</h2>
            </div>

            {activity && activity.length > 0 ? (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border/60 hover:bg-secondary/50"
                  >
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug truncate">
                        {item.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        resgatou {item.quantidade} ingresso{item.quantidade > 1 ? 's' : ''} ·{' '}
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma atividade registrada ainda.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
