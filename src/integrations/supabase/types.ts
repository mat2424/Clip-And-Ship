export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          stripe_session_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          stripe_session_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          stripe_session_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      health_check_logs: {
        Row: {
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          source: string
          status: string
          timestamp: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          source?: string
          status: string
          timestamp?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          source?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      pending_videos: {
        Row: {
          approved_at: string | null
          caption: string | null
          created_at: string | null
          execution_id: string | null
          id: string
          idea: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string | null
          titles_descriptions: Json | null
          upload_targets: string[] | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          caption?: string | null
          created_at?: string | null
          execution_id?: string | null
          id?: string
          idea: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          titles_descriptions?: Json | null
          upload_targets?: string[] | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          caption?: string | null
          created_at?: string | null
          execution_id?: string | null
          id?: string
          idea?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          titles_descriptions?: Json | null
          upload_targets?: string[] | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          email: string
          full_name: string | null
          google_id: string | null
          id: string
          subscription_tier: string
          terms_accepted_at: string | null
          updated_at: string
          welcome_credits_given: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email: string
          full_name?: string | null
          google_id?: string | null
          id: string
          subscription_tier?: string
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_credits_given?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string
          full_name?: string | null
          google_id?: string | null
          id?: string
          subscription_tier?: string
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_credits_given?: boolean
        }
        Relationships: []
      }
      social_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      video_ideas: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          caption: string | null
          created_at: string
          environment_prompt: string | null
          id: string
          idea_text: string
          instagram_link: string | null
          instagram_media_id: string | null
          instagram_title: string | null
          n8n_webhook_id: string | null
          preview_video_url: string | null
          rejected_reason: string | null
          selected_platforms: string[]
          sound_prompt: string | null
          status: string
          tiktok_link: string | null
          tiktok_title: string | null
          tiktok_video_id: string | null
          updated_at: string
          upload_errors: Json | null
          upload_progress: Json | null
          upload_status: Json | null
          use_ai_voice: boolean
          user_id: string
          video_url: string | null
          voice_file_url: string | null
          youtube_link: string | null
          youtube_title: string | null
          youtube_video_id: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          caption?: string | null
          created_at?: string
          environment_prompt?: string | null
          id?: string
          idea_text: string
          instagram_link?: string | null
          instagram_media_id?: string | null
          instagram_title?: string | null
          n8n_webhook_id?: string | null
          preview_video_url?: string | null
          rejected_reason?: string | null
          selected_platforms?: string[]
          sound_prompt?: string | null
          status?: string
          tiktok_link?: string | null
          tiktok_title?: string | null
          tiktok_video_id?: string | null
          updated_at?: string
          upload_errors?: Json | null
          upload_progress?: Json | null
          upload_status?: Json | null
          use_ai_voice?: boolean
          user_id: string
          video_url?: string | null
          voice_file_url?: string | null
          youtube_link?: string | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          caption?: string | null
          created_at?: string
          environment_prompt?: string | null
          id?: string
          idea_text?: string
          instagram_link?: string | null
          instagram_media_id?: string | null
          instagram_title?: string | null
          n8n_webhook_id?: string | null
          preview_video_url?: string | null
          rejected_reason?: string | null
          selected_platforms?: string[]
          sound_prompt?: string | null
          status?: string
          tiktok_link?: string | null
          tiktok_title?: string | null
          tiktok_video_id?: string | null
          updated_at?: string
          upload_errors?: Json | null
          upload_progress?: Json | null
          upload_status?: Json | null
          use_ai_voice?: boolean
          user_id?: string
          video_url?: string | null
          voice_file_url?: string | null
          youtube_link?: string | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json | null
          result: Json | null
          status: string
          user_id: string
          webhook_id: string
          webhook_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
          user_id: string
          webhook_id: string
          webhook_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
          user_id?: string
          webhook_id?: string
          webhook_type?: string
        }
        Relationships: []
      }
      youtube_tokens: {
        Row: {
          access_token: string
          channel_id: string | null
          channel_name: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_uploads: {
        Row: {
          created_at: string
          description: string | null
          id: string
          privacy_status: string
          processing_status: string | null
          title: string
          upload_status: string
          user_id: string
          video_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          privacy_status?: string
          processing_status?: string | null
          title: string
          upload_status?: string
          user_id: string
          video_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          privacy_status?: string
          processing_status?: string | null
          title?: string
          upload_status?: string
          user_id?: string
          video_id?: string
          video_url?: string
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
      social_platform:
        | "youtube"
        | "tiktok"
        | "instagram"
        | "facebook"
        | "x"
        | "linkedin"
        | "threads"
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
      social_platform: [
        "youtube",
        "tiktok",
        "instagram",
        "facebook",
        "x",
        "linkedin",
        "threads",
      ],
    },
  },
} as const
