import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Event } from '@/types/database';
import { toast } from 'sonner';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: { name: string; event_date?: string; description?: string; background_url?: string; created_by: string }) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar evento: ' + error.message);
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: { id: string; name?: string; event_date?: string | null; description?: string | null; background_url?: string | null }) => {
      const { id, ...updates } = event;
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar evento: ' + error.message);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir evento: ' + error.message);
    },
  });
}
