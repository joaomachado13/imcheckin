import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventStats {
  ingressos: number;
  resgatados: number;
  pendentes: number;
}

export interface DashboardStats {
  byEvent: Record<string, EventStats>;
  totals: EventStats;
  checkinsToday: number;
}

/** Read-only aggregates used purely for dashboard presentation. */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const byEvent: Record<string, EventStats> = {};
      const totals: EventStats = { ingressos: 0, resgatados: 0, pendentes: 0 };

      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('buyers')
          .select('event_id, num_ingressos, ingressos_resgatados')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data?.length) break;

        for (const row of data as any[]) {
          const entry = byEvent[row.event_id] ?? { ingressos: 0, resgatados: 0, pendentes: 0 };
          entry.ingressos += row.num_ingressos ?? 0;
          entry.resgatados += row.ingressos_resgatados ?? 0;
          entry.pendentes = Math.max(0, entry.ingressos - entry.resgatados);
          byEvent[row.event_id] = entry;
        }
        if (data.length < pageSize) break;
      }

      for (const entry of Object.values(byEvent)) {
        totals.ingressos += entry.ingressos;
        totals.resgatados += entry.resgatados;
      }
      totals.pendentes = Math.max(0, totals.ingressos - totals.resgatados);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('desfeito', false)
        .gte('created_at', startOfDay.toISOString());

      return { byEvent, totals, checkinsToday: count ?? 0 };
    },
    staleTime: 60_000,
  });
}

export interface RecentActivityItem {
  id: string;
  nome: string;
  quantidade: number;
  created_at: string;
}

export function useRecentActivity(limit = 6) {
  return useQuery({
    queryKey: ['dashboard-recent-activity', limit],
    queryFn: async (): Promise<RecentActivityItem[]> => {
      const { data, error } = await supabase
        .from('redemptions')
        .select('id, quantidade, created_at, nome_retirada, buyers(nome)')
        .eq('desfeito', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any[]).map((r) => ({
        id: r.id,
        nome: r.nome_retirada || r.buyers?.nome || 'Participante',
        quantidade: r.quantidade ?? 1,
        created_at: r.created_at,
      }));
    },
    staleTime: 30_000,
  });
}
