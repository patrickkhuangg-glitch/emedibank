// Database types for the exam-prep platform.
//
// Hand-maintained to mirror `supabase/migrations`. Once the Supabase project has
// the CLI linked you can regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type ExamKind = 'mcq' | 'interview'
export type UserRole = 'student' | 'tutor' | 'admin'
export type ProductKind = 'exam' | 'bundle'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type EntitlementSource = 'subscription' | 'bundle' | 'comp'
export type QuestionKind = 'single_best_answer'
export type VideoStatus = 'none' | 'processing' | 'ready'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type InterfaceMode = 'playful' | 'clean'

export type Database = {
  public: {
    Tables: {
      exams: {
        Row: {
          id: string
          name: string
          slug: string
          kind: ExamKind
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          kind: ExamKind
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          kind?: ExamKind
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: UserRole
          stripe_customer_id: string | null
          interface_mode: InterfaceMode
          essay_credits: number
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
          interface_mode?: InterfaceMode
          essay_credits?: number
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
          interface_mode?: InterfaceMode
          essay_credits?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      subtests: {
        Row: {
          id: string
          exam_id: string
          name: string
          slug: string
          is_free: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          name: string
          slug: string
          is_free?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          name?: string
          slug?: string
          is_free?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subtests_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          stripe_product_id: string | null
          name: string
          kind: ProductKind
          exam_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stripe_product_id?: string | null
          name: string
          kind: ProductKind
          exam_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stripe_product_id?: string | null
          name?: string
          kind?: ProductKind
          exam_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: SubscriptionStatus
          current_period_end: string | null
          price_id: string | null
          product_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status: SubscriptionStatus
          current_period_end?: string | null
          price_id?: string | null
          product_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          current_period_end?: string | null
          price_id?: string | null
          product_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      entitlements: {
        Row: {
          id: string
          user_id: string
          exam_id: string
          source: EntitlementSource
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id: string
          source: EntitlementSource
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string
          source?: EntitlementSource
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entitlements_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          },
        ]
      }
      stimuli: {
        Row: {
          id: string
          subtest_id: string
          title: string | null
          data: unknown
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          subtest_id: string
          title?: string | null
          data?: unknown
          sort_order?: number
          created_at?: string
        }
        Update: {
          title?: string | null
          data?: unknown
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'stimuli_subtest_id_fkey'
            columns: ['subtest_id']
            referencedRelation: 'subtests'
            referencedColumns: ['id']
          },
        ]
      }
      questions: {
        Row: {
          id: string
          subtest_id: string
          stimulus_id: string | null
          topic: string | null
          kind: QuestionKind
          stem: string
          tags: string[]
          data: unknown
          explanation_text: string | null
          difficulty: Difficulty | null
          sort_order: number
          published: boolean
          mux_asset_id: string | null
          mux_playback_id: string | null
          video_status: VideoStatus
          video_duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          subtest_id: string
          stimulus_id?: string | null
          topic?: string | null
          kind?: QuestionKind
          stem: string
          tags?: string[]
          data?: unknown
          explanation_text?: string | null
          difficulty?: Difficulty | null
          sort_order?: number
          published?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          video_status?: VideoStatus
          video_duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          stimulus_id?: string | null
          topic?: string | null
          kind?: QuestionKind
          stem?: string
          tags?: string[]
          data?: unknown
          explanation_text?: string | null
          difficulty?: Difficulty | null
          sort_order?: number
          published?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          video_status?: VideoStatus
          video_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'questions_subtest_id_fkey'
            columns: ['subtest_id']
            referencedRelation: 'subtests'
            referencedColumns: ['id']
          },
        ]
      }
      question_options: {
        Row: {
          id: string
          question_id: string
          label: string
          body: string
          is_correct: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          question_id: string
          label: string
          body: string
          is_correct?: boolean
          sort_order?: number
        }
        Update: {
          label?: string
          body?: string
          is_correct?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'question_options_question_id_fkey'
            columns: ['question_id']
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      question_attempts: {
        Row: {
          id: string
          user_id: string
          question_id: string
          subtest_id: string
          exam_id: string
          selected_option_id: string | null
          response: unknown
          is_correct: boolean
          time_spent_seconds: number | null
          answered_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          subtest_id: string
          exam_id: string
          selected_option_id?: string | null
          response?: unknown
          is_correct: boolean
          time_spent_seconds?: number | null
          answered_at?: string
        }
        Update: {
          is_correct?: boolean
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'question_attempts_question_id_fkey'
            columns: ['question_id']
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      practice_sessions: {
        Row: {
          id: string
          user_id: string
          exam_id: string
          subtest_id: string | null
          tag: string | null
          mode: string
          total: number
          correct: number
          time_spent_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id: string
          subtest_id?: string | null
          tag?: string | null
          mode?: string
          total: number
          correct: number
          time_spent_seconds?: number | null
          created_at?: string
        }
        Update: {
          tag?: string | null
          mode?: string
          total?: number
          correct?: number
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'practice_sessions_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'practice_sessions_subtest_id_fkey'
            columns: ['subtest_id']
            referencedRelation: 'subtests'
            referencedColumns: ['id']
          },
        ]
      }
      essay_prompts: {
        Row: {
          id: string
          subtest_id: string
          task: string
          theme: string
          instructions: string
          quotes: unknown
          suggested_minutes: number
          is_free: boolean
          published: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          subtest_id: string
          task?: string
          theme: string
          instructions?: string
          quotes?: unknown
          suggested_minutes?: number
          is_free?: boolean
          published?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          task?: string
          theme?: string
          instructions?: string
          quotes?: unknown
          suggested_minutes?: number
          is_free?: boolean
          published?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'essay_prompts_subtest_id_fkey'
            columns: ['subtest_id']
            referencedRelation: 'subtests'
            referencedColumns: ['id']
          },
        ]
      }
      essay_responses: {
        Row: {
          id: string
          user_id: string
          prompt_id: string
          body: string
          word_count: number
          timed: boolean
          duration_minutes: number | null
          time_spent_seconds: number
          status: string
          plan: string | null
          sitting_id: string | null
          marking_status: string | null
          tutor_feedback: string | null
          credits_spent: number
          submitted_for_marking_at: string | null
          marked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt_id: string
          body?: string
          word_count?: number
          timed?: boolean
          duration_minutes?: number | null
          time_spent_seconds?: number
          status?: string
          plan?: string | null
          sitting_id?: string | null
          marking_status?: string | null
          tutor_feedback?: string | null
          credits_spent?: number
          submitted_for_marking_at?: string | null
          marked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          body?: string
          word_count?: number
          timed?: boolean
          duration_minutes?: number | null
          time_spent_seconds?: number
          status?: string
          plan?: string | null
          sitting_id?: string | null
          marking_status?: string | null
          tutor_feedback?: string | null
          credits_spent?: number
          submitted_for_marking_at?: string | null
          marked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'essay_responses_prompt_id_fkey'
            columns: ['prompt_id']
            referencedRelation: 'essay_prompts'
            referencedColumns: ['id']
          },
        ]
      }
      essay_markings: {
        Row: {
          id: string
          response_id: string
          ai_feedback: string | null
          draft_feedback: string | null
          status: string
          marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          response_id: string
          ai_feedback?: string | null
          draft_feedback?: string | null
          status?: string
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          draft_feedback?: string | null
          status?: string
          marked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'essay_markings_response_id_fkey'
            columns: ['response_id']
            referencedRelation: 'essay_responses'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      spend_essay_credits: {
        Args: { p_amount: number }
        Returns: boolean
      }
    }
    Enums: {
      exam_kind: ExamKind
      user_role: UserRole
      product_kind: ProductKind
      subscription_status: SubscriptionStatus
      entitlement_source: EntitlementSource
      question_kind: QuestionKind
      video_status: VideoStatus
    }
    CompositeTypes: Record<never, never>
  }
}

// Convenience row aliases.
export type Exam = Database['public']['Tables']['exams']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subtest = Database['public']['Tables']['subtests']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Entitlement = Database['public']['Tables']['entitlements']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type QuestionOption = Database['public']['Tables']['question_options']['Row']
export type QuestionAttempt = Database['public']['Tables']['question_attempts']['Row']
export type Stimulus = Database['public']['Tables']['stimuli']['Row']
export type EssayPrompt = Database['public']['Tables']['essay_prompts']['Row']
export type EssayResponse = Database['public']['Tables']['essay_responses']['Row']
export type EssayMarking = Database['public']['Tables']['essay_markings']['Row']
