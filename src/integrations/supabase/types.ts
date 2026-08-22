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
      assessments: {
        Row: {
          answers: Json
          created_at: string
          id: string
          questions: Json
          score: number
          subject: string
          topic_analysis: Json
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          questions?: Json
          score?: number
          subject: string
          topic_analysis?: Json
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          questions?: Json
          score?: number
          subject?: string
          topic_analysis?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_level: string | null
          daily_study_hours: number | null
          email: string | null
          exam_date: string | null
          id: string
          learning_goal: string | null
          name: string | null
          onboarded: boolean
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: string | null
          daily_study_hours?: number | null
          email?: string | null
          exam_date?: string | null
          id: string
          learning_goal?: string | null
          name?: string | null
          onboarded?: boolean
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: string | null
          daily_study_hours?: number | null
          email?: string | null
          exam_date?: string | null
          id?: string
          learning_goal?: string | null
          name?: string | null
          onboarded?: boolean
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          created_at: string
          feedback: Json
          id: string
          questions: Json
          score: number
          topic: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          feedback?: Json
          id?: string
          questions?: Json
          score?: number
          topic: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          feedback?: Json
          id?: string
          questions?: Json
          score?: number
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          plan_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_progress: {
        Row: {
          attempts: number
          id: string
          last_score: number | null
          mastery_score: number
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          id?: string
          last_score?: number | null
          mastery_score?: number
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          id?: string
          last_score?: number | null
          mastery_score?: number
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      socratic_sessions: {
        Row: {
          id: string
          user_id: string
          topic: string
          question_id: string | null
          question: string
          expected_concept: string | null
          student_answer: string
          student_reasoning: string
          initial_analysis: Json
          challenge: string | null
          challenge_type: string | null
          challenge_difficulty: string | null
          student_defense: string | null
          defense_evaluation: Json | null
          misconception: string | null
          mastery_before: number | null
          mastery_after: number | null
          strictness: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic: string
          question_id?: string | null
          question: string
          expected_concept?: string | null
          student_answer: string
          student_reasoning: string
          initial_analysis?: Json
          challenge?: string | null
          challenge_type?: string | null
          challenge_difficulty?: string | null
          student_defense?: string | null
          defense_evaluation?: Json | null
          misconception?: string | null
          mastery_before?: number | null
          mastery_after?: number | null
          strictness?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string
          question_id?: string | null
          question?: string
          expected_concept?: string | null
          student_answer?: string
          student_reasoning?: string
          initial_analysis?: Json
          challenge?: string | null
          challenge_type?: string | null
          challenge_difficulty?: string | null
          student_defense?: string | null
          defense_evaluation?: Json | null
          misconception?: string | null
          mastery_before?: number | null
          mastery_after?: number | null
          strictness?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_misconceptions: {
        Row: {
          id: string
          user_id: string
          topic: string
          concept: string
          misconception: string
          category: string
          severity: string
          resolved: boolean
          frequency: number
          first_detected_at: string
          last_detected_at: string
          resolved_at: string | null
          session_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          topic: string
          concept: string
          misconception: string
          category?: string
          severity?: string
          resolved?: boolean
          frequency?: number
          first_detected_at?: string
          last_detected_at?: string
          resolved_at?: string | null
          session_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string
          concept?: string
          misconception?: string
          category?: string
          severity?: string
          resolved?: boolean
          frequency?: number
          first_detected_at?: string
          last_detected_at?: string
          resolved_at?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          id: string
          user_id: string
          name: string
          subject: string
          exam_date: string
          target_score: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          subject: string
          exam_date: string
          target_score?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          subject?: string
          exam_date?: string
          target_score?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          file_name: string
          file_type: string
          pyq_year: number | null
          extracted_text: string
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          file_name: string
          file_type: string
          pyq_year?: number | null
          extracted_text?: string
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          pyq_year?: number | null
          extracted_text?: string
          created_at?: string
        }
        Relationships: []
      }
      syllabus_topics: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          unit_name: string
          chapter_name: string | null
          topic: string
          subtopics: Json
          weightage: number | null
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          unit_name?: string
          chapter_name?: string | null
          topic: string
          subtopics?: Json
          weightage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          unit_name?: string
          chapter_name?: string | null
          topic?: string
          subtopics?: Json
          weightage?: number | null
          created_at?: string
        }
        Relationships: []
      }
      pyq_questions: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          year: number
          question_text: string
          marks: number | null
          question_type: string
          mapped_topic: string | null
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          year: number
          question_text: string
          marks?: number | null
          question_type?: string
          mapped_topic?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          year?: number
          question_text?: string
          marks?: number | null
          question_type?: string
          mapped_topic?: string | null
          created_at?: string
        }
        Relationships: []
      }
      topic_pyq_analysis: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          topic: string
          unit_name: string | null
          pyq_count: number
          years_appeared: Json
          repeat_pattern: string
          priority: string
          priority_reason: string
          evidence: Json
          estimated_difficulty: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          topic: string
          unit_name?: string | null
          pyq_count?: number
          years_appeared?: Json
          repeat_pattern?: string
          priority?: string
          priority_reason?: string
          evidence?: Json
          estimated_difficulty?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          topic?: string
          unit_name?: string | null
          pyq_count?: number
          years_appeared?: Json
          repeat_pattern?: string
          priority?: string
          priority_reason?: string
          evidence?: Json
          estimated_difficulty?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_topic_selections: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          topic: string
          selected: boolean
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          topic: string
          selected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          topic?: string
          selected?: boolean
          created_at?: string
        }
        Relationships: []
      }
      exam_study_plans: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          days_until_exam: number
          plan_schedule: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          days_until_exam?: number
          plan_schedule?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          days_until_exam?: number
          plan_schedule?: Json
          created_at?: string
          updated_at?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
