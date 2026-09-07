import type { InterviewStory } from '@/lib/interviews/stories'
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
export type TranscriptionStatus = 'not_requested' | 'processing' | 'ready' | 'failed'
export type StudyPlanStatus = 'active' | 'paused' | 'completed'
export type StudyPlanItemKind = 'tutoring' | 'masterclass' | 'workshop' | 'other'
export type TutoringSessionStatus = 'scheduled' | 'completed' | 'needs_review' | 'cancelled'

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
          mmi_credits: number
          phone_number: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
          interface_mode?: InterfaceMode
          essay_credits?: number
          mmi_credits?: number
          phone_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
          interface_mode?: InterfaceMode
          essay_credits?: number
          mmi_credits?: number
          phone_number?: string | null
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
      study_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          status: StudyPlanStatus
          starts_on: string | null
          ends_on: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status?: StudyPlanStatus
          starts_on?: string | null
          ends_on?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          status?: StudyPlanStatus
          starts_on?: string | null
          ends_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_plan_items: {
        Row: {
          id: string
          plan_id: string
          kind: StudyPlanItemKind
          title: string
          exam_scope: string | null
          total_units: number
          used_units: number
          unit_label: 'hours' | 'sessions' | 'places' | 'credits'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          kind?: StudyPlanItemKind
          title: string
          exam_scope?: string | null
          total_units: number
          used_units?: number
          unit_label?: 'hours' | 'sessions' | 'places' | 'credits'
          created_at?: string
          updated_at?: string
        }
        Update: {
          kind?: StudyPlanItemKind
          title?: string
          exam_scope?: string | null
          total_units?: number
          used_units?: number
          unit_label?: 'hours' | 'sessions' | 'places' | 'credits'
          updated_at?: string
        }
        Relationships: []
      }
      study_plan_exam_dates: {
        Row: {
          id: string
          user_id: string
          exam_id: string
          label: string
          exam_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id: string
          label?: string
          exam_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          label?: string
          exam_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_plan_tasks: {
        Row: {
          id: string
          user_id: string
          exam_id: string | null
          body: string
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id?: string | null
          body: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          exam_id?: string | null
          body?: string
          is_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tutoring_sessions: {
        Row: {
          id: string
          plan_id: string
          plan_item_id: string
          student_id: string
          tutor_id: string | null
          student_email: string
          title: string
          scheduled_for: string
          booked_minutes: number
          zoom_meeting_id: string
          zoom_meeting_uuid: string | null
          zoom_join_url: string
          zoom_start_url: string
          google_calendar_event_id: string | null
          tutor_notes: string | null
          homework: string | null
          status: TutoringSessionStatus
          actual_minutes: number | null
          overrun_minutes: number
          base_deducted_at: string | null
          overrun_deducted_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          plan_item_id: string
          student_id: string
          tutor_id?: string | null
          student_email: string
          title: string
          scheduled_for: string
          booked_minutes: number
          zoom_meeting_id: string
          zoom_meeting_uuid?: string | null
          zoom_join_url: string
          zoom_start_url: string
          google_calendar_event_id?: string | null
          tutor_notes?: string | null
          homework?: string | null
          status?: TutoringSessionStatus
          actual_minutes?: number | null
          overrun_minutes?: number
          base_deducted_at?: string | null
          overrun_deducted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tutor_id?: string | null
          title?: string
          scheduled_for?: string
          booked_minutes?: number
          zoom_meeting_uuid?: string | null
          zoom_start_url?: string
          google_calendar_event_id?: string | null
          tutor_notes?: string | null
          homework?: string | null
          status?: TutoringSessionStatus
          actual_minutes?: number | null
          overrun_minutes?: number
          base_deducted_at?: string | null
          overrun_deducted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          updated_at?: string
        }
        Relationships: []
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
          question_ids: string[]
          responses: unknown
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
          question_ids?: string[]
          responses?: unknown
          created_at?: string
        }
        Update: {
          tag?: string | null
          mode?: string
          total?: number
          correct?: number
          time_spent_seconds?: number | null
          question_ids?: string[]
          responses?: unknown
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
      interview_practice_logs: TableShape<InterviewPracticeLog, 'id' | 'user_id' | 'station_id' | 'format' | 'source'>
      interview_attempts: TableShape<InterviewAttemptRow, 'user_id' | 'format' | 'station_id' | 'station_title' | 'recording_path' | 'recording_mime_type'>
      interview_markings: TableShape<InterviewMarkingRow, 'attempt_id'>
      interview_transcript_layouts: TableShape<{attempt_id:string;source_hash:string;questions_hash:string;status:'processing'|'ready'|'failed';attempt_count:number;request_id:string;started_at:string;layout:unknown;model:string|null},'attempt_id'|'source_hash'|'questions_hash'|'status'|'request_id'>
      interview_processing_jobs: TableShape<InterviewJobRow, 'attempt_id' | 'job_type'>
      interview_marking_events: TableShape<InterviewEventRow, 'attempt_id' | 'event_type'>
      interview_stories: TableShape<InterviewStory, 'id' | 'user_id' | 'title' | 'theme' | 'context' | 'actions' | 'reflection'>
      interview_study_notes: {
        Row: {
          id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          body?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          user_id: string
          refresh_token: string
          calendar_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          refresh_token: string
          calendar_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          refresh_token?: string
          calendar_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_question_assignments: {
        Row: {
          id: string
          exam_id: string
          mock_key: string
          subtest_id: string
          question_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          mock_key: string
          subtest_id: string
          question_id: string
          sort_order: number
          created_at?: string
        }
        Update: {
          mock_key?: string
          subtest_id?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'mock_question_assignments_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mock_question_assignments_subtest_id_fkey'
            columns: ['subtest_id']
            referencedRelation: 'subtests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mock_question_assignments_question_id_fkey'
            columns: ['question_id']
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      launch_waitlist: {
        Row: {
          id: string
          email: string
          source: string
          consented_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          source?: string
          consented_at?: string
          created_at?: string
        }
        Update: {
          email?: string
          source?: string
          consented_at?: string
          created_at?: string
        }
        Relationships: []
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
          primary_provider: string | null
          primary_model: string | null
          secondary_feedback: string | null
          secondary_provider: string | null
          secondary_model: string | null
          rubric_version: string | null
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
          primary_provider?: string | null
          primary_model?: string | null
          secondary_feedback?: string | null
          secondary_provider?: string | null
          secondary_model?: string | null
          rubric_version?: string | null
          draft_feedback?: string | null
          status?: string
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          primary_provider?: string | null
          primary_model?: string | null
          secondary_feedback?: string | null
          secondary_provider?: string | null
          secondary_model?: string | null
          rubric_version?: string | null
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
      claim_interview_transcript_layout: { Args: { p_attempt_id: string; p_user_id: string; p_request_id: string }; Returns: unknown }
      complete_interview_transcript_layout: { Args: { p_attempt_id: string; p_user_id: string; p_request_id: string; p_layout: unknown; p_model: string }; Returns: boolean }
      authorize_signup: { Args: { p_email: string; p_token_hash: string }; Returns: undefined }
      consume_interview_transcription: { Args: { p_user_id: string }; Returns: boolean }
      defer_interview_transcription: { Args: { p_job_id: string; p_worker: string }; Returns: boolean }
      list_interview_review_queue: { Args: { p_format: string; p_status: string; p_offset: number }; Returns: InterviewAttemptRow[] }

      enqueue_interview_retention: { Args: { p_days: number }; Returns: number }
      reserve_interview_deletion: { Args: { p_attempt_id: string; p_user_id: string }; Returns: boolean }

      reserve_account_trial: { Args: { p_user_id: string }; Returns: string }
      request_essay_marking: { Args: { p_response_id: string }; Returns: string }
      submit_essay_response: { Args: { p_response_id: string; p_body: string; p_time_spent_seconds: number; p_plan: string | null }; Returns: string }
      submit_mock_interview_for_marking: { Args: { p_session_id: string; p_expected_credits: number }; Returns: { status: string; charged?: number } }
      submit_interview_for_marking: { Args: { p_attempt_id: string; p_expected_credits: number }; Returns: string }
      refund_interview_marking: { Args: { p_attempt_id: string; p_actor_id: string; p_reason: string }; Returns: string }
      claim_next_interview_job: { Args: { p_worker: string }; Returns: InterviewJobRow[] }
      complete_interview_job: { Args: { p_job_id: string; p_worker: string; p_payload: unknown }; Returns: boolean }
      fail_interview_job: { Args: { p_job_id: string; p_worker: string; p_code: string; p_delay: number }; Returns: boolean }
      finalise_interview_upload: { Args: { p_attempt_id: string; p_user_id: string; p_duration: number; p_events: unknown; p_has_audio: boolean }; Returns: boolean }
      review_interview_marking: { Args: { p_attempt_id: string; p_actor_id: string; p_version: number; p_action: string; p_feedback: unknown; p_notes: string; p_corrections: string; p_watched: boolean }; Returns: string }
      retry_interview_job: { Args: { p_attempt_id: string; p_actor_id: string; p_job_type: string }; Returns: string }

      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      spend_essay_credits: {
        Args: { p_amount: number }
        Returns: boolean
      }
      grant_subscription_benefit: {
        Args: {
          p_user_id: string
          p_stripe_subscription_id: string
          p_benefit: string
          p_period_end: string
          p_amount: number
        }
        Returns: boolean
      }
      consume_signup_attempt: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      complete_tutoring_session: {
        Args: { p_session_id: string; p_actual_minutes: number; p_student_attended: boolean }
        Returns: Database['public']['Tables']['tutoring_sessions']['Row']
      }
      approve_tutoring_overrun: {
        Args: { p_session_id: string }
        Returns: Database['public']['Tables']['tutoring_sessions']['Row']
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
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type StudyPlanItem = Database['public']['Tables']['study_plan_items']['Row']
export type StudyPlanExamDate = Database['public']['Tables']['study_plan_exam_dates']['Row']
export type StudyPlanTask = Database['public']['Tables']['study_plan_tasks']['Row']
export type TutoringSession = Database['public']['Tables']['tutoring_sessions']['Row']

export type InterviewUploadStatus = 'awaiting_upload' | 'uploading' | 'ready' | 'failed' | 'discarded'
export type InterviewMarkingStatus = 'queued' | 'processing' | 'awaiting_review' | 'in_review' | 'released' | 'needs_attention' | 'ungradable'
type TableShape<R, K extends keyof R> = { Row: R; Insert: Partial<R> & Pick<R,K>; Update: Partial<R>; Relationships: [] }
export type InterviewAttemptRow = {
 id: string; user_id: string; format: 'mmi' | 'panel'; station_id: string; station_title: string;
 questions: unknown; duration_seconds: number; recording_path: string; recording_mime_type: string;
 transcript: string | null; transcription_status: TranscriptionStatus; transcription_model: string | null; created_at: string;
 media_kind: 'audio' | 'video'; transcription_audio_path: string | null; upload_status: InterviewUploadStatus;
 station_snapshot: unknown; question_events: unknown; marking_status: InterviewMarkingStatus | null; credits_spent: number;
 marking_preflight_at: string | null; submitted_for_marking_at: string | null; reviewed_at: string | null; released_at: string | null; approved_feedback: unknown; video_deleted_at: string | null;
}
export type InterviewMarkingRow = {
 id: string; attempt_id: string; status: 'pending' | 'awaiting_review' | 'in_review' | 'released' | 'ungradable';
 ai_assessment: unknown; evidence_audit: unknown; draft_feedback: unknown; private_reviewer_notes: string | null; transcript_correction_notes: string | null;
 primary_provider: string | null; primary_model: string | null; audit_provider: string | null; audit_model: string | null; rubric_version: string | null;
 assigned_to: string | null; marked_by: string | null; ai_generated_at: string | null; approved_at: string | null;
 created_at: string; updated_at: string; lock_version: number;
}
export type InterviewJobRow = {
 id: string; attempt_id: string; job_type: 'transcribe' | 'assess' | 'audit' | 'cleanup';
 status: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead'; attempt_count: number; max_attempts: number;
 available_at: string; locked_at: string | null; locked_by: string | null; last_error_code: string | null; last_error_message: string | null;
 created_at: string; updated_at: string;
}
export type InterviewEventRow = { id: string; attempt_id: string; actor_id: string | null; event_type: string; metadata: unknown; created_at: string }

export type InterviewPracticeLog = {
 id: string; user_id: string; station_id: string; format: 'mmi' | 'panel'; source: 'rehearsal' | 'recording'; attempt_id: string | null;
 started_at: string; completed_at: string | null; duration_seconds: number; self_rating: number | null;
}
