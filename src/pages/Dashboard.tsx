import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, useCreateEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar, Plus, Trash2, Users, ChevronRight, Loader2, Image, Settings2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { data: events, isLoading } = useEvents();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Eventos</h1>
          <p className="text-muted-foreground text-base mt-1.5">
            {events?.length || 0} evento{events?.length !== 1 ? 's' : ''} cadastrado{events?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-premium gap-2 px-5 h-11 text-sm font-semibold">
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
                    <Label htmlFor="name" className="font-semibold">Nome do Evento *</Label>
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
                    <Label htmlFor="event_date" className="font-semibold">Data do Evento</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-semibold">Descrição</Label>
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
                        <img src={newEvent.background_url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ou colar URL</summary>
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
                  <Button type="submit" disabled={createEvent.isPending} className="btn-premium text-primary-foreground">
                    {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Evento
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Events Grid with liquid glass v4 cards */}
      {events && events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card
              key={event.id}
              className="event-card group relative glass-card-v4 border-white/50 dark:border-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Background image layer */}
              {event.background_url && (
                <div 
                  className="event-card-bg"
                  style={{ backgroundImage: `url(${event.background_url})` }}
                />
              )}
              
              {/* Content layer */}
              <div className="relative z-10">
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="font-display text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {event.name}
                    </CardTitle>
                    {isAdmin && (
                      <div className="flex gap-1">
                        {/* Edit background button */}
                        <Dialog open={editingEvent === event.id} onOpenChange={(open) => {
                          setEditingEvent(open ? event.id : null);
                          if (open) setBackgroundUrl(event.background_url || '');
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
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
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ou colar URL</summary>
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
                                    onError={(e) => e.currentTarget.style.display = 'none'}
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

                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todos os compradores e resgates
                                associados também serão excluídos.
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
                  {event.event_date && (
                    <CardDescription className="flex items-center gap-1.5 text-sm font-medium mt-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 px-6 pb-6">
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-5 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  <Link to={`/event/${event.id}`}>
                    <Button 
                      variant="outline" 
                      className="w-full font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all h-10"
                    >
                      Abrir Evento
                      <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      ) : (
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
              <Button onClick={() => setIsCreateOpen(true)} className="btn-premium text-primary-foreground gap-2 px-8 h-12 text-base font-bold">
                <Plus className="h-5 w-5" />
                Criar Primeiro Evento
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
