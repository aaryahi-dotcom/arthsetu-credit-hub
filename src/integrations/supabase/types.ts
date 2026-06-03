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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          age: number | null
          annual_income: number | null
          arthsetu_score: number | null
          bank_balance: number | null
          cibil_score: number | null
          created_at: string
          credit_enquiries_6m: number | null
          credit_utilization_pct: number | null
          decision: string | null
          default_probability: number | null
          digital_footprint_score: number | null
          email_sent: boolean
          employment_tenure_months: number | null
          existing_loan_count: number | null
          factors: Json | null
          fixed_deposits: number | null
          full_name: string
          gold_value: number | null
          id: string
          loan_amount_requested: number | null
          loan_defaults_ever: number | null
          missed_payments_12m: number | null
          model_version: string | null
          monthly_net_income: number | null
          net_worth: number | null
          occupation_type: string | null
          override_admin_id: string | null
          override_applied: boolean
          override_new_score: number | null
          override_reason: string | null
          override_timestamp: string | null
          property_value: number | null
          purpose_of_credit: string | null
          recommendations: Json | null
          recommended_credit_limit: number | null
          recommended_interest_rate: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          score_band: string | null
          status: Database["public"]["Enums"]["application_status"]
          tax_filing_years: number | null
          total_emi_monthly: number | null
          total_liabilities: number | null
          updated_at: string
          user_id: string
          vehicle_value: number | null
        }
        Insert: {
          age?: number | null
          annual_income?: number | null
          arthsetu_score?: number | null
          bank_balance?: number | null
          cibil_score?: number | null
          created_at?: string
          credit_enquiries_6m?: number | null
          credit_utilization_pct?: number | null
          decision?: string | null
          default_probability?: number | null
          digital_footprint_score?: number | null
          email_sent?: boolean
          employment_tenure_months?: number | null
          existing_loan_count?: number | null
          factors?: Json | null
          fixed_deposits?: number | null
          full_name: string
          gold_value?: number | null
          id?: string
          loan_amount_requested?: number | null
          loan_defaults_ever?: number | null
          missed_payments_12m?: number | null
          model_version?: string | null
          monthly_net_income?: number | null
          net_worth?: number | null
          occupation_type?: string | null
          override_admin_id?: string | null
          override_applied?: boolean
          override_new_score?: number | null
          override_reason?: string | null
          override_timestamp?: string | null
          property_value?: number | null
          purpose_of_credit?: string | null
          recommendations?: Json | null
          recommended_credit_limit?: number | null
          recommended_interest_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_band?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tax_filing_years?: number | null
          total_emi_monthly?: number | null
          total_liabilities?: number | null
          updated_at?: string
          user_id: string
          vehicle_value?: number | null
        }
        Update: {
          age?: number | null
          annual_income?: number | null
          arthsetu_score?: number | null
          bank_balance?: number | null
          cibil_score?: number | null
          created_at?: string
          credit_enquiries_6m?: number | null
          credit_utilization_pct?: number | null
          decision?: string | null
          default_probability?: number | null
          digital_footprint_score?: number | null
          email_sent?: boolean
          employment_tenure_months?: number | null
          existing_loan_count?: number | null
          factors?: Json | null
          fixed_deposits?: number | null
          full_name?: string
          gold_value?: number | null
          id?: string
          loan_amount_requested?: number | null
          loan_defaults_ever?: number | null
          missed_payments_12m?: number | null
          model_version?: string | null
          monthly_net_income?: number | null
          net_worth?: number | null
          occupation_type?: string | null
          override_admin_id?: string | null
          override_applied?: boolean
          override_new_score?: number | null
          override_reason?: string | null
          override_timestamp?: string | null
          property_value?: number | null
          purpose_of_credit?: string | null
          recommendations?: Json | null
          recommended_credit_limit?: number | null
          recommended_interest_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_band?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tax_filing_years?: number | null
          total_emi_monthly?: number | null
          total_liabilities?: number | null
          updated_at?: string
          user_id?: string
          vehicle_value?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          data_after: Json | null
          data_before: Json | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          mobile: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "override_approved"
        | "override_rejected"
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
      app_role: ["admin", "customer"],
      application_status: [
        "pending",
        "approved",
        "rejected",
        "override_approved",
        "override_rejected",
      ],
    },
  },
} as const
