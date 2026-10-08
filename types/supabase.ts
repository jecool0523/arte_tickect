// Application RPC JSON contracts. Exact live schema: database.generated.ts.
import type { Database as GeneratedDatabase } from "./database.generated"
import type { MembershipState, AdminMembershipRequest } from "./admin-membership"

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type BookingRow = GeneratedDatabase["public"]["Tables"]["toctoc_bookings"]["Row"]

type BookingInsert = {
  id?: never
  user_id?: string | null
  name: string
  student_id: string
  seat_grade: string
  selected_seats: string[]
  special_request?: string | null
  booking_date?: string
  status?: string
  created_at?: string
  updated_at?: string
}

type BookingUpdate = Partial<Omit<BookingInsert, "id">>

type BookingTable = {
  Row: BookingRow
  Insert: BookingInsert
  Update: BookingUpdate
  Relationships: []
}

export type ReviewRow = GeneratedDatabase["public"]["Tables"]["reviews"]["Row"]

export type PublicReviewRow = Pick<ReviewRow, "id" | "musical_id" | "user_name" | "content" | "image_url" | "rating" | "created_at">

export type PresaleAccessKeyRow = GeneratedDatabase["public"]["Tables"]["presale_access_keys"]["Row"]

export type ProfileRow = GeneratedDatabase["public"]["Tables"]["profiles"]["Row"]

export type Database = {
  public: {
    Tables: {
      performance_settings: {
        Row: { musical_id: string; details: Json; updated_at: string }
        Insert: { musical_id: string; details: Json; updated_at?: string }
        Update: { details?: Json; updated_at?: string }
        Relationships: []
      }
      arte_musical_application_period: {
        Row: {
          id: number
          musical_name: string
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: never
          musical_name: string
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          musical_name?: string
          start_time?: string
          end_time?: string
          created_at?: string
        }
        Relationships: []
      }
      arte_musical_tickets: BookingTable
      dead_poets_society_bookings: BookingTable
      presale_access_keys: {
        Row: PresaleAccessKeyRow
        Insert: {
          id?: never
          musical_id: string
          key_hash: string
          label?: string | null
          starts_at?: string | null
          ends_at?: string | null
          max_uses?: number | null
          max_seats_per_booking?: number | null
          used_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          musical_id?: string
          key_hash?: string
          label?: string | null
          starts_at?: string | null
          ends_at?: string | null
          max_uses?: number | null
          max_seats_per_booking?: number | null
          used_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          display_name?: string | null
          student_id?: string | null
          avatar_url?: string | null
          username?: string | null
          contact_number?: string | null
          profile_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          student_id?: string | null
          avatar_url?: string | null
          username?: string | null
          contact_number?: string | null
          profile_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rent_bookings: BookingTable
      toctoc_bookings: BookingTable
      reviews: {
        Row: ReviewRow
        Insert: {
          id?: never
          user_id?: string | null
          musical_id: string
          user_name: string
          password?: string | null
          password_hash?: string | null
          content: string
          image_url?: string | null
          rating?: number
          created_at?: string
        }
        Update: {
          user_id?: string | null
          musical_id?: string
          user_name?: string
          password?: string | null
          password_hash?: string | null
          content?: string
          image_url?: string | null
          rating?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_arte_membership_state: { Args: { p_user_id: string }; Returns: MembershipState }
      submit_arte_membership_request: { Args: { p_user_id: string; p_is_member: boolean }; Returns: { success: boolean; code?: string; state?: MembershipState } }
      list_arte_admin_requests: { Args: { p_admin_id: string }; Returns: { success: boolean; code?: string; requests?: AdminMembershipRequest[]; total?: number } }
      review_arte_admin_request: { Args: { p_admin_id: string; p_request_id: string; p_approve: boolean }; Returns: { success: boolean; code?: string; status?: string } }
      get_account_fan_activity: { Args: { p_user_id: string }; Returns: Json }
      record_account_fan_visit: { Args: { p_user_id: string }; Returns: Json }
      create_account_review: {
        Args: { p_user_id: string; p_musical_id: string; p_user_name: string; p_deletion_token: string; p_content: string; p_rating: number; p_image_url: string | null }
        Returns: PublicReviewRow[]
      }
      save_admin_performance: { Args: { p_musical_id: string; p_details: Json; p_start: string; p_end: string }; Returns: undefined }
      book_musical_seats: {
        Args: {
          p_musical_id: string
          p_name: string
          p_student_id: string
          p_seat_grade: string
          p_selected_seats: string[]
          p_special_request: string | null
          p_user_id: string
        }
        Returns: {
          success: boolean
          bookingId?: number
          bookingDate?: string
          conflictSeats?: string[]
          code?: string
          presale?: boolean
          error?: string
        }
      }
      check_rate_limit: {
        Args: { p_bucket: string; p_subject_hash: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      consume_presale_access_key: {
        Args: {
          p_musical_id: string
          p_key: string
        }
        Returns: boolean
      }
      create_presale_access_key: {
        Args: {
          p_musical_id: string
          p_key: string
          p_label?: string | null
          p_starts_at?: string | null
          p_ends_at?: string | null
          p_max_uses?: number | null
        }
        Returns: number
      }
      create_review: {
        Args: {
          p_musical_id: string
          p_user_name: string
          p_deletion_token: string
          p_content: string
          p_rating: number
          p_image_url: string | null
        }
        Returns: PublicReviewRow[]
      }
      delete_review_with_token: {
        Args: { p_review_id: number; p_deletion_token: string }
        Returns: boolean
      }
      delete_review_with_password: {
        Args: {
          p_review_id: number
          p_password: string
        }
        Returns: boolean
      }
      release_presale_access_key: {
        Args: {
          p_musical_id: string
          p_key: string
        }
        Returns: boolean
      }
      get_presale_access_key_seat_limit: {
        Args: {
          p_musical_id: string
          p_key: string
        }
        Returns: number | null
      }
      validate_presale_access_key: {
        Args: {
          p_musical_id: string
          p_key: string
        }
        Returns: boolean
      }
      update_profile: {
        Args: {
          p_user_id: string
          p_display_name: string | null
          p_student_id: string | null
          p_avatar_url: string | null
        }
        Returns: {
          success: boolean
          error?: string
          code?: string
        }
      }
      save_profile_and_sync_bookings: {
        Args: { p_user_id: string; p_username: string; p_display_name: string; p_student_id: string; p_contact_number: string }
        Returns: { success: boolean; linked_count?: number; error?: string; code?: string }
      }
      sync_legacy_bookings: {
        Args: { p_user_id: string }
        Returns: { success: boolean; linked_count: number; code?: string }
      }
      delete_account: {
        Args: { p_user_id: string }
        Returns: {
          success: boolean
          message?: string
          error?: string
        }
      }
      get_user_email_status: {
        Args: { p_user_id: string }
        Returns: {
          success: boolean
          email?: string
          email_confirmed?: boolean
          email_confirmed_at?: string | null
          error?: string
        }
      }
      is_current_user_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      set_user_admin_status: {
        Args: {
          p_target_user_id: string
          p_is_admin: boolean
          p_by_admin_id: string
        }
        Returns: {
          success: boolean
          error?: string
          code?: string
          is_admin?: boolean
        }
      }
      admin_get_all_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string | null
        }
        Returns: {
          success: boolean
          users: {
            id: string
            email: string
            display_name: string | null
            student_id: string | null
            avatar_url: string | null
            is_admin: boolean
            is_presale_user: boolean
            email_confirmed: boolean
            created_at: string
            updated_at: string
            booking_count: number
            review_count: number
          }[]
          total: number
          limit: number
          offset: number
          error?: string
          code?: string
        }
      }
      // Historical endpoint contract only; RPC is NOT installed in the live DB.
      // Do not grant/create this function without verified administrator authorization.
      admin_delete_review: {
        Args: { p_review_id: number }
        Returns: {
          success: boolean
          error?: string
          code?: string
        }
      }
      set_user_presale_status: {
        Args: {
          p_target_user_id: string
          p_is_presale: boolean
          p_by_admin_id: string
        }
        Returns: {
          success: boolean
          error?: string
          code?: string
          is_presale_user?: boolean
        }
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
