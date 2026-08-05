export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          contato: string | null
          contato_normalizado: string | null
          created_at: string
          data_compra: string | null
          entrega: string | null
          event_id: string
          id: string
          ingressos_resgatados: number
          ministerios: string[]
          motivo_remocao: string | null
          nome: string
          num_ingressos: number
          removido: boolean
          removido_em: string | null
          removido_por: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string
          data_compra?: string | null
          entrega?: string | null
          event_id: string
          id?: string
          ingressos_resgatados?: number
          ministerios?: string[]
          motivo_remocao?: string | null
          nome: string
          num_ingressos?: number
          removido?: boolean
          removido_em?: string | null
          removido_por?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string
          data_compra?: string | null
          entrega?: string | null
          event_id?: string
          id?: string
          ingressos_resgatados?: number
          ministerios?: string[]
          motivo_remocao?: string | null
          nome?: string
          num_ingressos?: number
          removido?: boolean
          removido_em?: string | null
          removido_por?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      conferences: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          background_url: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string | null
          id: string
          name: string
          sheet_url: string | null
          updated_at: string
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string | null
          id?: string
          name: string
          sheet_url?: string | null
          updated_at?: string
        }
        Update: {
          background_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string | null
          id?: string
          name?: string
          sheet_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          buyer_id: string
          created_at: string
          desfeito: boolean
          desfeito_em: string | null
          desfeito_por: string | null
          event_id: string
          id: string
          justificativa_desfazer: string | null
          nome_retirada: string | null
          observacao: string | null
          operador_id: string
          operador_nome: string | null
          quantidade: number
          resgatado_por_comprador: boolean
          telefone_retirada: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          desfeito?: boolean
          desfeito_em?: string | null
          desfeito_por?: string | null
          event_id: string
          id?: string
          justificativa_desfazer?: string | null
          nome_retirada?: string | null
          observacao?: string | null
          operador_id: string
          operador_nome?: string | null
          quantidade: number
          resgatado_por_comprador?: boolean
          telefone_retirada?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          desfeito?: boolean
          desfeito_em?: string | null
          desfeito_por?: string | null
          event_id?: string
          id?: string
          justificativa_desfazer?: string | null
          nome_retirada?: string | null
          observacao?: string | null
          operador_id?: string
          operador_nome?: string | null
          quantidade?: number
          resgatado_por_comprador?: boolean
          telefone_retirada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_redemptions: {
        Row: {
          conference_id: string
          created_at: string
          desfeito: boolean
          desfeito_em: string | null
          desfeito_por: string | null
          id: string
          justificativa_desfazer: string | null
          observacao: string | null
          operador_id: string
          operador_nome: string | null
          volunteer_id: string
        }
        Insert: {
          conference_id: string
          created_at?: string
          desfeito?: boolean
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          justificativa_desfazer?: string | null
          observacao?: string | null
          operador_id: string
          operador_nome?: string | null
          volunteer_id: string
        }
        Update: {
          conference_id?: string
          created_at?: string
          desfeito?: boolean
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          justificativa_desfazer?: string | null
          observacao?: string | null
          operador_id?: string
          operador_nome?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_redemptions_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_redemptions_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_redemptions_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          contato: string | null
          contato_normalizado: string | null
          created_at: string
          funcao: string | null
          id: string
          motivo_remocao: string | null
          nome: string
          removido: boolean
          removido_em: string | null
          removido_por: string | null
          updated_at: string
        }
        Insert: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string
          funcao?: string | null
          id?: string
          motivo_remocao?: string | null
          nome: string
          removido?: boolean
          removido_em?: string | null
          removido_por?: string | null
          updated_at?: string
        }
        Update: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string
          funcao?: string | null
          id?: string
          motivo_remocao?: string | null
          nome?: string
          removido?: boolean
          removido_em?: string | null
          removido_por?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      buyers_secure: {
        Row: {
          contato: string | null
          contato_normalizado: string | null
          created_at: string | null
          data_compra: string | null
          entrega: string | null
          event_id: string | null
          id: string | null
          ingressos_resgatados: number | null
          ministerios: string[] | null
          nome: string | null
          num_ingressos: number | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          updated_at: string | null
        }
        Insert: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string | null
          data_compra?: string | null
          entrega?: string | null
          event_id?: string | null
          id?: string | null
          ingressos_resgatados?: number | null
          ministerios?: string[] | null
          nome?: string | null
          num_ingressos?: number | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
        }
        Update: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string | null
          data_compra?: string | null
          entrega?: string | null
          event_id?: string | null
          id?: string | null
          ingressos_resgatados?: number | null
          ministerios?: string[] | null
          nome?: string | null
          num_ingressos?: number | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      events_secure: {
        Row: {
          background_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string | null
          name: string | null
          sheet_url: string | null
          updated_at: string | null
        }
        Insert: {
          background_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string | null
          name?: string | null
          sheet_url?: never
          updated_at?: string | null
        }
        Update: {
          background_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string | null
          name?: string | null
          sheet_url?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      volunteers_secure: {
        Row: {
          contato: string | null
          contato_normalizado: string | null
          created_at: string | null
          funcao: string | null
          id: string | null
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string | null
          funcao?: string | null
          id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          contato?: string | null
          contato_normalizado?: string | null
          created_at?: string | null
          funcao?: string | null
          id?: string | null
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      mask_contact: { Args: { contact: string }; Returns: string }
      normalize_phone: { Args: { phone: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "operador"
      approval_status: "pending" | "approved" | "rejected"
      delivery_status: "pendente" | "parcial" | "resgatado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador"],
      approval_status: ["pending", "approved", "rejected"],
      delivery_status: ["pendente", "parcial", "resgatado"],
    },
  },
} as const
