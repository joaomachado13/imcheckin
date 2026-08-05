import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Buyer, Redemption } from '@/types/database';
export type { Buyer, Redemption };
import { toast } from 'sonner';
import { normalizeImportedBuyer, normalizePhone } from '@/lib/buyers/importNormalization';
import { sanitizeSearchTerm } from '@/lib/security/sanitize';
import { groupAndMergeBuyers } from '@/lib/import/excelParser';

// Use buyers_secure view for masked contact info (non-admins see masked data)
export function useBuyers(eventId: string | undefined) {
  return useQuery({
    queryKey: ['buyers', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      // Paginate to bypass Supabase's default 1000-row cap
      const pageSize = 1000;
      const all: Buyer[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('buyers_secure')
          .select('*')
          .eq('event_id', eventId)
          .order('nome')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as Buyer[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    enabled: !!eventId,
  });
}

export function useSearchBuyers(eventId: string | undefined, searchTerm: string) {
  // Sanitize inputs to prevent SQL injection
  const sanitizedTerm = sanitizeSearchTerm(searchTerm);
  const normalizedSearch = normalizePhone(searchTerm);

  return useQuery({
    queryKey: ['buyers', 'search', eventId, sanitizedTerm],
    queryFn: async () => {
      if (!eventId || !sanitizedTerm.trim()) return [];

      // Use buyers_secure view for masked contact info
      const { data, error } = await supabase
        .from('buyers_secure')
        .select('*')
        .eq('event_id', eventId)
        .or(`nome.ilike.%${sanitizedTerm}%,contato_normalizado.ilike.%${normalizedSearch}%`)
        .order('nome')
        .limit(50);

      if (error) throw error;
      return data as Buyer[];
    },
    enabled: !!eventId && sanitizedTerm.trim().length > 0,
  });
}

export function useBuyer(buyerId: string | undefined) {
  return useQuery({
    queryKey: ['buyers', 'detail', buyerId],
    queryFn: async () => {
      if (!buyerId) return null;
      // Use buyers_secure view for masked contact info
      const { data, error } = await supabase
        .from('buyers_secure')
        .select('*')
        .eq('id', buyerId)
        .maybeSingle();

      if (error) throw error;
      return data as Buyer | null;
    },
    enabled: !!buyerId,
  });
}

export function useBuyerRedemptions(buyerId: string | undefined) {
  return useQuery({
    queryKey: ['redemptions', buyerId],
    queryFn: async () => {
      if (!buyerId) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Redemption[];
    },
    enabled: !!buyerId,
  });
}

export function useEventRedemptions(eventId: string | undefined) {
  return useQuery({
    queryKey: ['redemptions', 'event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('event_id', eventId)
        .eq('desfeito', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Redemption[];
    },
    enabled: !!eventId,
  });
}

export function useCreateRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (redemption: {
      buyer_id: string;
      event_id: string;
      quantidade: number;
      resgatado_por_comprador: boolean;
      nome_retirada?: string;
      telefone_retirada?: string;
      observacao?: string;
      operador_id: string;
      operador_nome?: string;
    }) => {
      const { data, error } = await supabase
        .from('redemptions')
        .insert(redemption)
        .select()
        .single();

      if (error) throw error;
      return data as Redemption;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['redemptions', variables.buyer_id] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success('Resgate registrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar resgate: ' + error.message);
    },
  });
}

export function useUndoRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      redemptionId,
      justificativa,
      userId,
    }: {
      redemptionId: string;
      justificativa: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('redemptions')
        .update({
          desfeito: true,
          desfeito_em: new Date().toISOString(),
          desfeito_por: userId,
          justificativa_desfazer: justificativa,
        })
        .eq('id', redemptionId)
        .select()
        .single();

      if (error) throw error;
      return data as Redemption;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['redemptions', data.buyer_id] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success('Resgate desfeito com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao desfazer resgate: ' + error.message);
    },
  });
}

export function useImportBuyers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      buyers,
    }: {
      eventId: string;
      buyers: Array<{
        data_compra?: string;
        nome: string;
        contato?: string;
        num_ingressos: number;
        entrega?: string;
        ministerios?: string[];
      }>;
    }) => {
      const buyersToInsert = buyers.map((buyer) => ({
        ...normalizeImportedBuyer(buyer),
        event_id: eventId,
      }));

      const { data, error } = await supabase
        .from('buyers')
        .insert(buyersToInsert)
        .select();

      if (error) throw error;
      return data as Buyer[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      toast.success(`${_.length} compradores importados com sucesso!`);
    },
    onError: (error) => {
      toast.error('Erro ao importar compradores: ' + error.message);
    },
  });
}

export function useRedeemAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buyerId,
      eventId,
      quantidade,
      operadorId,
      operadorNome,
    }: {
      buyerId: string;
      eventId: string;
      quantidade: number;
      operadorId: string;
      operadorNome?: string;
    }) => {
      const { data, error } = await supabase
        .from('redemptions')
        .insert({
          buyer_id: buyerId,
          event_id: eventId,
          quantidade,
          resgatado_por_comprador: true,
          operador_id: operadorId,
          operador_nome: operadorNome,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Redemption;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['redemptions', variables.buyerId] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success('Todos os ingressos resgatados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao resgatar: ' + error.message);
    },
  });
}

export function useRemoveBuyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      buyerId,
      motivo,
      userId,
    }: {
      buyerId: string;
      motivo: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('buyers')
        .update({
          removido: true,
          removido_em: new Date().toISOString(),
          removido_por: userId,
          motivo_remocao: motivo,
        })
        .eq('id', buyerId)
        .select()
        .single();

      if (error) throw error;
      return data as Buyer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success('Comprador removido da lista com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

export function useDeleteBuyers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, buyerIds }: { eventId: string; buyerIds: string[] }) => {
      if (buyerIds.length === 0) return 0;
      const { error } = await supabase.from('buyers').delete().in('id', buyerIds);
      if (error) throw error;
      return buyerIds.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      toast.success(`${count} registro(s) duplicado(s) apagado(s)!`);
    },
    onError: (error) => {
      toast.error('Erro ao apagar duplicados: ' + error.message);
    },
  });
}

export function useDeleteAllBuyers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('buyers')
        .delete()
        .eq('event_id', eventId);

      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', eventId] });
      toast.success('Lista de compradores zerada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao apagar compradores: ' + error.message);
    },
  });
}

export function useImportFromGoogleSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      sheetUrl,
    }: {
      eventId: string;
      sheetUrl: string;
    }) => {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'import-google-sheet',
        {
          body: { sheetUrl },
        }
      );

      if (functionError) throw functionError;
      if (functionData.error) throw new Error(functionData.error);

      const buyers = functionData.buyers as Array<{
        data_compra?: string;
        nome: string;
        contato?: string;
        num_ingressos: number;
        entrega?: string;
        ministerios?: string[];
      }>;

      if (!buyers || buyers.length === 0) {
        throw new Error('Nenhum comprador encontrado na planilha');
      }

      const mergedBuyers = groupAndMergeBuyers(buyers);

      const buyersToInsert = mergedBuyers.map((buyer) => ({
        ...normalizeImportedBuyer(buyer),
        event_id: eventId,
      }));

      const { data, error } = await supabase
        .from('buyers')
        .insert(buyersToInsert)
        .select();

      if (error) throw error;
      return data as Buyer[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyers', variables.eventId] });
      toast.success(`${data.length} compradores importados do Google Sheets!`);
    },
    onError: (error) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });
}
