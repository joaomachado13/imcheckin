export type AppRole = 'admin' | 'operador';
export type DeliveryStatus = 'pendente' | 'parcial' | 'resgatado';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  event_date: string | null;
  description: string | null;
  sheet_url: string | null;
  background_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Buyer {
  id: string;
  event_id: string;
  data_compra: string | null;
  nome: string;
  contato: string | null;
  contato_normalizado: string | null;
  num_ingressos: number;
  entrega: string | null;
  ingressos_resgatados: number;
  status: DeliveryStatus;
  ministerios: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  buyer_id: string;
  event_id: string;
  quantidade: number;
  resgatado_por_comprador: boolean;
  nome_retirada: string | null;
  telefone_retirada: string | null;
  observacao: string | null;
  operador_id: string;
  operador_nome: string | null;
  created_at: string;
  desfeito: boolean;
  desfeito_em: string | null;
  desfeito_por: string | null;
  justificativa_desfazer: string | null;
}

export interface Conference {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Volunteer {
  id: string;
  nome: string;
  contato: string | null;
  contato_normalizado: string | null;
  funcao: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerRedemption {
  id: string;
  volunteer_id: string;
  conference_id: string;
  operador_id: string;
  operador_nome: string | null;
  observacao: string | null;
  desfeito: boolean;
  desfeito_em: string | null;
  desfeito_por: string | null;
  justificativa_desfazer: string | null;
  created_at: string;
}
