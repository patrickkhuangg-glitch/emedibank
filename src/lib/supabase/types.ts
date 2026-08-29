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
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          stripe_customer_id?: string | null
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
    }
    Views: Record<never, never>
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
    }
    Enums: {
      exam_kind: ExamKind
      user_role: UserRole
      product_kind: ProductKind
      subscription_status: SubscriptionStatus
      entitlement_source: EntitlementSource
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
