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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      aspect_weight_overrides: {
        Row: {
          aspect_id: string
          created_at: string
          id: string
          stage_number: number
          updated_at: string
          version: number
          weight: number
        }
        Insert: {
          aspect_id: string
          created_at?: string
          id?: string
          stage_number: number
          updated_at?: string
          version?: number
          weight: number
        }
        Update: {
          aspect_id?: string
          created_at?: string
          id?: string
          stage_number?: number
          updated_at?: string
          version?: number
          weight?: number
        }
        Relationships: []
      }
      aspects: {
        Row: {
          aspect_id: string
          aspect_name: string
          created_at: string
          family_codes: string
          owner_question: string
          updated_at: string
        }
        Insert: {
          aspect_id: string
          aspect_name: string
          created_at?: string
          family_codes?: string
          owner_question?: string
          updated_at?: string
        }
        Update: {
          aspect_id?: string
          aspect_name?: string
          created_at?: string
          family_codes?: string
          owner_question?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string
          contact_email: string
          created_at: string
          id: string
          phone: string
          primary_contact: string
          status: string
        }
        Insert: {
          company: string
          contact_email?: string
          created_at?: string
          id?: string
          phone?: string
          primary_contact?: string
          status?: string
        }
        Update: {
          company?: string
          contact_email?: string
          created_at?: string
          id?: string
          phone?: string
          primary_contact?: string
          status?: string
        }
        Relationships: []
      }
      control_register: {
        Row: {
          active: boolean
          applicable_delivery_models: string
          aspect_id: string | null
          continuous: boolean
          control_id: string
          created_at: string
          criticality: string
          dependencies: string
          dependency: string
          domain: string
          downstream_exposure: string
          expected_evidence: string
          family_code: string
          family_name: string
          id: string
          inherits_forward: boolean
          irreversibility: string
          min_tier: string
          objective: string
          primary_owner_role: string
          requirement: string
          responsible_seat: string
          stage_name: string
          stage_number: number
          supporting_seats: string
          title: string
          trigger_logic: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applicable_delivery_models?: string
          aspect_id?: string | null
          continuous?: boolean
          control_id: string
          created_at?: string
          criticality?: string
          dependencies?: string
          dependency?: string
          domain?: string
          downstream_exposure?: string
          expected_evidence?: string
          family_code?: string
          family_name?: string
          id?: string
          inherits_forward?: boolean
          irreversibility?: string
          min_tier?: string
          objective?: string
          primary_owner_role?: string
          requirement?: string
          responsible_seat?: string
          stage_name?: string
          stage_number: number
          supporting_seats?: string
          title?: string
          trigger_logic?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applicable_delivery_models?: string
          aspect_id?: string | null
          continuous?: boolean
          control_id?: string
          created_at?: string
          criticality?: string
          dependencies?: string
          dependency?: string
          domain?: string
          downstream_exposure?: string
          expected_evidence?: string
          family_code?: string
          family_name?: string
          id?: string
          inherits_forward?: boolean
          irreversibility?: string
          min_tier?: string
          objective?: string
          primary_owner_role?: string
          requirement?: string
          responsible_seat?: string
          stage_name?: string
          stage_number?: number
          supporting_seats?: string
          title?: string
          trigger_logic?: string
          updated_at?: string
        }
        Relationships: []
      }
      engagements: {
        Row: {
          client_id: string
          created_at: string
          fee_tier: string
          id: string
          project_name: string
          scope: string
          signed_at: string | null
          size_m: number
          status: Database["public"]["Enums"]["engagement_status"]
          term: string
        }
        Insert: {
          client_id: string
          created_at?: string
          fee_tier?: string
          id?: string
          project_name: string
          scope?: string
          signed_at?: string | null
          size_m?: number
          status?: Database["public"]["Enums"]["engagement_status"]
          term?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          fee_tier?: string
          id?: string
          project_name?: string
          scope?: string
          signed_at?: string | null
          size_m?: number
          status?: Database["public"]["Enums"]["engagement_status"]
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          action: string
          active: boolean
          aspect_id: string | null
          condition: Json
          conditions: string
          created_at: string
          description: string
          false_positive_checks: string
          id: string
          name: string
          rule_id: string | null
          scope: string
          severity: string
          severity_floor: string
          stages: number[]
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          aspect_id?: string | null
          condition?: Json
          conditions?: string
          created_at?: string
          description?: string
          false_positive_checks?: string
          id?: string
          name: string
          rule_id?: string | null
          scope?: string
          severity?: string
          severity_floor?: string
          stages?: number[]
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          aspect_id?: string | null
          condition?: Json
          conditions?: string
          created_at?: string
          description?: string
          false_positive_checks?: string
          id?: string
          name?: string
          rule_id?: string | null
          scope?: string
          severity?: string
          severity_floor?: string
          stages?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      lifecycle_stages: {
        Row: {
          created_at: string
          domain_weights: Json
          exit_criteria: Json
          stage_name: string
          stage_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain_weights?: Json
          exit_criteria?: Json
          stage_name: string
          stage_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain_weights?: Json
          exit_criteria?: Json
          stage_name?: string
          stage_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          assessment_fee_usd: number
          channel_deal: boolean
          client_id: string | null
          contact_name: string
          contact_title: string
          created_at: string
          email: string
          engagement_id: string | null
          entity_tag: Database["public"]["Enums"]["entity_tag"]
          expected_close: string | null
          id: string
          loss_reason: string
          loss_reason_code: string | null
          monitoring_arr_usd: number
          next_action: string
          next_action_date: string | null
          notes: string
          opportunity_id: string
          org_name: string
          org_type: string
          out_of_scope: boolean
          owner: string
          phone: string
          probability_pct: number
          project_id: number | null
          project_name: string
          project_value_usd: number
          referred_by_contact_id: string | null
          reviewer_days_required: number
          segment: string
          source: string
          source_detail: string
          stage: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered: string | null
          updated_at: string
        }
        Insert: {
          assessment_fee_usd?: number
          channel_deal?: boolean
          client_id?: string | null
          contact_name?: string
          contact_title?: string
          created_at?: string
          email?: string
          engagement_id?: string | null
          entity_tag?: Database["public"]["Enums"]["entity_tag"]
          expected_close?: string | null
          id?: string
          loss_reason?: string
          loss_reason_code?: string | null
          monitoring_arr_usd?: number
          next_action?: string
          next_action_date?: string | null
          notes?: string
          opportunity_id: string
          org_name: string
          org_type?: string
          out_of_scope?: boolean
          owner?: string
          phone?: string
          probability_pct?: number
          project_id?: number | null
          project_name?: string
          project_value_usd?: number
          referred_by_contact_id?: string | null
          reviewer_days_required?: number
          segment?: string
          source?: string
          source_detail?: string
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered?: string | null
          updated_at?: string
        }
        Update: {
          assessment_fee_usd?: number
          channel_deal?: boolean
          client_id?: string | null
          contact_name?: string
          contact_title?: string
          created_at?: string
          email?: string
          engagement_id?: string | null
          entity_tag?: Database["public"]["Enums"]["entity_tag"]
          expected_close?: string | null
          id?: string
          loss_reason?: string
          loss_reason_code?: string | null
          monitoring_arr_usd?: number
          next_action?: string
          next_action_date?: string | null
          notes?: string
          opportunity_id?: string
          org_name?: string
          org_type?: string
          out_of_scope?: boolean
          owner?: string
          phone?: string
          probability_pct?: number
          project_id?: number | null
          project_name?: string
          project_value_usd?: number
          referred_by_contact_id?: string | null
          reviewer_days_required?: number
          segment?: string
          source?: string
          source_detail?: string
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_entered?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          title?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string
          id: string
          project_id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      project_controls: {
        Row: {
          control_id: string
          created_at: string
          evidence_ref: string
          id: string
          notes: string
          project_id: number
          status: string
          updated_at: string
          verified_by: string
          verified_date: string | null
        }
        Insert: {
          control_id: string
          created_at?: string
          evidence_ref?: string
          id?: string
          notes?: string
          project_id: number
          status?: string
          updated_at?: string
          verified_by?: string
          verified_date?: string | null
        }
        Update: {
          control_id?: string
          created_at?: string
          evidence_ref?: string
          id?: string
          notes?: string
          project_id?: number
          status?: string
          updated_at?: string
          verified_by?: string
          verified_date?: string | null
        }
        Relationships: []
      }
      review_items: {
        Row: {
          aspect_id: string
          aspect_name: string
          confidence: string
          control_id: string
          created_at: string
          detail: string
          due_date: string | null
          evidence_ref: string
          exposure_usd: number
          headline: string
          id: string
          kind: string
          project_id: number
          project_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string
          severity: string
          source_excerpt: string
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          aspect_id?: string
          aspect_name?: string
          confidence?: string
          control_id?: string
          created_at?: string
          detail?: string
          due_date?: string | null
          evidence_ref?: string
          exposure_usd?: number
          headline?: string
          id?: string
          kind?: string
          project_id: number
          project_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string
          severity?: string
          source_excerpt?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Update: {
          aspect_id?: string
          aspect_name?: string
          confidence?: string
          control_id?: string
          created_at?: string
          detail?: string
          due_date?: string | null
          evidence_ref?: string
          exposure_usd?: number
          headline?: string
          id?: string
          kind?: string
          project_id?: number
          project_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string
          severity?: string
          source_excerpt?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviewer_capacity: {
        Row: {
          created_at: string
          id: string
          month: string
          reviewer_days_available: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          reviewer_days_available?: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          reviewer_days_available?: number
        }
        Relationships: []
      }
      stage_exit_criteria: {
        Row: {
          active: boolean
          blocking: string
          created_at: string
          criterion_id: string
          evidence_required: string
          exit_criterion: string
          id: string
          linked_families: string
          stage_name: string
          stage_number: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          blocking?: string
          created_at?: string
          criterion_id: string
          evidence_required?: string
          exit_criterion: string
          id?: string
          linked_families?: string
          stage_name?: string
          stage_number: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          blocking?: string
          created_at?: string
          criterion_id?: string
          evidence_required?: string
          exit_criterion?: string
          id?: string
          linked_families?: string
          stage_name?: string
          stage_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "executive" | "project_manager" | "reviewer"
      engagement_status: "draft" | "sent" | "signed"
      entity_tag: "CLAIMZERO" | "RESOLUTE"
      opportunity_stage:
        | "IDENTIFIED"
        | "CONTACTED"
        | "MET"
        | "DEMO"
        | "PROPOSAL"
        | "ENGAGED"
        | "DELIVERED"
        | "MONITORING"
        | "LOST"
        | "DORMANT"
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
      app_role: ["admin", "executive", "project_manager", "reviewer"],
      engagement_status: ["draft", "sent", "signed"],
      entity_tag: ["CLAIMZERO", "RESOLUTE"],
      opportunity_stage: [
        "IDENTIFIED",
        "CONTACTED",
        "MET",
        "DEMO",
        "PROPOSAL",
        "ENGAGED",
        "DELIVERED",
        "MONITORING",
        "LOST",
        "DORMANT",
      ],
    },
  },
} as const
