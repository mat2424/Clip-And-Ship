export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          created_at: string
          credits: number
          email: string
          id: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          email: string
          id: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string
          id?: string
          subscription_tier?: string
          updated_at?: string
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      ],
    },
  },
} as const
