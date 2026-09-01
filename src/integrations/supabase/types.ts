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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string | null
          gradient_from: string | null
          gradient_to: string | null
          icon: string
          id: string
          max_progress: number
          name: string
          requirement: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          icon: string
          id: string
          max_progress?: number
          name: string
          requirement?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          icon?: string
          id?: string
          max_progress?: number
          name?: string
          requirement?: string | null
        }
        Relationships: []
      }
      beta_signups: {
        Row: {
          child_grade: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          child_grade?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          child_grade?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      child_badges: {
        Row: {
          badge_id: string
          child_id: string
          id: string
          is_unlocked: boolean
          progress: number
          unlocked_at: string | null
        }
        Insert: {
          badge_id: string
          child_id: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          unlocked_at?: string | null
        }
        Update: {
          badge_id?: string
          child_id?: string
          id?: string
          is_unlocked?: boolean
          progress?: number
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_progress: {
        Row: {
          average_score: number | null
          child_id: string
          exercises_completed: number
          id: string
          subject: Database["public"]["Enums"]["subject_type"]
          total_time_seconds: number
          total_xp: number
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          child_id: string
          exercises_completed?: number
          id?: string
          subject: Database["public"]["Enums"]["subject_type"]
          total_time_seconds?: number
          total_xp?: number
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          child_id?: string
          exercises_completed?: number
          id?: string
          subject?: Database["public"]["Enums"]["subject_type"]
          total_time_seconds?: number
          total_xp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number | null
          avatar_id: string | null
          avatar_url: string | null
          created_at: string
          grade: number
          id: string
          last_active_date: string | null
          level: number
          max_unlocked_stage: number
          name: string
          organization_id: string | null
          parent_id: string | null
          pending_promotion: boolean
          streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          age?: number | null
          avatar_id?: string | null
          avatar_url?: string | null
          created_at?: string
          grade?: number
          id?: string
          last_active_date?: string | null
          level?: number
          max_unlocked_stage?: number
          name: string
          organization_id?: string | null
          parent_id?: string | null
          pending_promotion?: boolean
          streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          age?: number | null
          avatar_id?: string | null
          avatar_url?: string | null
          created_at?: string
          grade?: number
          id?: string
          last_active_date?: string | null
          level?: number
          max_unlocked_stage?: number
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          pending_promotion?: boolean
          streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "children_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attempts: {
        Row: {
          answers: Json | null
          child_id: string
          completed_at: string
          exercise_id: string
          id: string
          max_score: number
          score: number
          stars: number
          time_spent_seconds: number
        }
        Insert: {
          answers?: Json | null
          child_id: string
          completed_at?: string
          exercise_id: string
          id?: string
          max_score?: number
          score?: number
          stars?: number
          time_spent_seconds?: number
        }
        Update: {
          answers?: Json | null
          child_id?: string
          completed_at?: string
          exercise_id?: string
          id?: string
          max_score?: number
          score?: number
          stars?: number
          time_spent_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          config: Json | null
          created_at: string
          display_order: number
          grade: number
          id: string
          is_active: boolean
          route: string
          stage: string
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          xp_reward: number
        }
        Insert: {
          config?: Json | null
          created_at?: string
          display_order?: number
          grade?: number
          id?: string
          is_active?: boolean
          route: string
          stage?: string
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          xp_reward?: number
        }
        Update: {
          config?: Json | null
          created_at?: string
          display_order?: number
          grade?: number
          id?: string
          is_active?: boolean
          route?: string
          stage?: string
          subject?: Database["public"]["Enums"]["subject_type"]
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parent_pins: {
        Row: {
          created_at: string
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: string
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      rewards: {
        Row: {
          child_id: string
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          is_completed: boolean
          parent_id: string
          required_exercises: number
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_completed?: boolean
          parent_id: string
          required_exercises?: number
          subject: Database["public"]["Enums"]["subject_type"]
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          is_completed?: boolean
          parent_id?: string
          required_exercises?: number
          subject?: Database["public"]["Enums"]["subject_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_children: number
          organization_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_children?: number
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_children?: number
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trimester_progress: {
        Row: {
          child_id: string
          completed_at: string | null
          created_at: string
          grade_level: number
          id: string
          is_completed: boolean
          trimester_number: number
          updated_at: string
          xp_earned: number
          xp_threshold: number
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          created_at?: string
          grade_level?: number
          id?: string
          is_completed?: boolean
          trimester_number: number
          updated_at?: string
          xp_earned?: number
          xp_threshold?: number
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          created_at?: string
          grade_level?: number
          id?: string
          is_completed?: boolean
          trimester_number?: number
          updated_at?: string
          xp_earned?: number
          xp_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "trimester_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
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
      complete_exercise: {
        Args: {
          p_answers?: Json
          p_child_id: string
          p_exercise_id: string
          p_max_score: number
          p_score: number
          p_stars: number
          p_time_spent: number
        }
        Returns: Json
      }
      has_parent_pin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_parent_pin: { Args: { p_pin: string }; Returns: undefined }
      verify_parent_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      exercise_status: "completed" | "available" | "locked"
      org_role: "owner" | "admin" | "teacher"
      subject_type: "math" | "reading" | "writing" | "other"
      subscription_plan: "free" | "basic" | "family" | "school"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
      user_type: "parent" | "teacher"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      exercise_status: ["completed", "available", "locked"],
      org_role: ["owner", "admin", "teacher"],
      subject_type: ["math", "reading", "writing", "other"],
      subscription_plan: ["free", "basic", "family", "school"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      user_type: ["parent", "teacher"],
    },
  },
} as const
