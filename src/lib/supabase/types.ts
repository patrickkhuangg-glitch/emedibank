// Database types for the exam-prep platform.
//
// These are hand-maintained to mirror `supabase/migrations`. Once the Supabase
// project exists you can regenerate them with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
// Keep the shape in sync with the latest migration until then.

export type ExamKind = 'mcq' | 'interview'
export type UserRole = 'student' | 'tutor' | 'admin'

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
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
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
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      exam_kind: ExamKind
      user_role: UserRole
    }
    CompositeTypes: Record<never, never>
  }
}

// Convenience row aliases.
export type Exam = Database['public']['Tables']['exams']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
