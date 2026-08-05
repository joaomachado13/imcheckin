import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Conference, Volunteer, VolunteerRedemption } from '@/types/database';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/buyers/importNormalization';

export function useConferences() {
  return useQuery({
    queryKey: ['conferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conferences')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Conference[];
    },
  });
}

export function useCreateConference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conf: { name: string; sort_order?: number }) => {
      const { data, error } = await supabase.from('conferences').insert(conf).select().single();
      if (error) throw error;
      return data as Conference;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conferences'] }); toast.success('Conferência adicionada!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateConference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; active?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase.from('conferences').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Conference;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conferences'] }); toast.success('Conferência atualizada!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteConference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('conferences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conferences'] }); toast.success('Conferência removida!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useVolunteers() {
  return useQuery({
    queryKey: ['volunteers'],
    queryFn: async () => {
      // Fetch all rows in pages of 1000 (Supabase default cap per request)
      const pageSize = 1000;
      const all: Volunteer[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('volunteers_secure')
          .select('*')
          .order('nome')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as Volunteer[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });
}

export function useImportVolunteers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (volunteers: Array<{ nome: string; contato?: string; funcao?: string }>) => {
      const toInsert = volunteers.map((v) => ({
        nome: v.nome.trim(),
        contato: v.contato?.trim() || null,
        funcao: v.funcao?.trim() || null,
      }));
      const { data, error } = await supabase.from('volunteers').insert(toInsert).select();
      if (error) throw error;
      return data as Volunteer[];
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success(`${data.length} voluntários importados!`); },
    onError: (e) => toast.error('Erro ao importar: ' + e.message),
  });
}

export function useVolunteerRedemptions() {
  return useQuery({
    queryKey: ['volunteer_redemptions'],
    queryFn: async () => {
      const pageSize = 1000;
      const all: VolunteerRedemption[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('volunteer_redemptions')
          .select('*')
          .eq('desfeito', false)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as VolunteerRedemption[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });
}

export function useDeleteAllVolunteers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Hard delete all volunteers. Cascading FKs on volunteer_redemptions don't exist,
      // so first wipe redemptions to avoid orphaned references.
      const { error: rErr } = await supabase
        .from('volunteer_redemptions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (rErr) throw rErr;
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      qc.invalidateQueries({ queryKey: ['volunteer_redemptions'] });
      toast.success('Lista de voluntários zerada!');
    },
    onError: (e) => toast.error('Erro ao zerar: ' + e.message),
  });
}

export function useCreateVolunteerRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (redemption: {
      volunteer_id: string;
      conference_id: string;
      operador_id: string;
      operador_nome?: string;
      observacao?: string;
    }) => {
      const { data, error } = await supabase
        .from('volunteer_redemptions')
        .insert(redemption)
        .select()
        .single();
      if (error) throw error;
      return data as VolunteerRedemption;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['volunteer_redemptions'] }); qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Conferência resgatada!'); },
    onError: (e) => {
      if (e.message.includes('idx_volunteer_one_redemption')) {
        toast.error('Este voluntário já resgatou uma conferência!');
      } else {
        toast.error('Erro: ' + e.message);
      }
    },
  });
}

export function useUndoVolunteerRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, justificativa }: { id: string; userId: string; justificativa: string }) => {
      const { data, error } = await supabase
        .from('volunteer_redemptions')
        .update({ desfeito: true, desfeito_em: new Date().toISOString(), desfeito_por: userId, justificativa_desfazer: justificativa })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as VolunteerRedemption;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['volunteer_redemptions'] }); toast.success('Resgate desfeito!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useVolunteerSheetUrl() {
  return useQuery({
    queryKey: ['app_settings', 'volunteers_sheet_url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'volunteers_sheet_url')
        .maybeSingle();
      if (error) throw error;
      return data?.value || '';
    },
  });
}

export function useSaveVolunteerSheetUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, userId }: { url: string; userId: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'volunteers_sheet_url', value: url, updated_by: userId, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app_settings', 'volunteers_sheet_url'] }); toast.success('Link da planilha salvo!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useSyncVolunteersSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sheetUrl: string) => {
      const { data, error } = await supabase.functions.invoke('sync-volunteers-sheet', {
        body: { sheetUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { inserted: number; total_in_sheet: number; already_existed: number; message: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success(data.message);
    },
    onError: (e) => toast.error('Erro ao sincronizar: ' + e.message),
  });
}

export function useRemoveVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ volunteerId, motivo, userId }: { volunteerId: string; motivo: string; userId: string }) => {
      const { error } = await supabase
        .from('volunteers')
        .update({ removido: true, removido_em: new Date().toISOString(), removido_por: userId, motivo_remocao: motivo })
        .eq('id', volunteerId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['volunteers'] }); toast.success('Voluntário removido!'); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}
