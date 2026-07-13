export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type BookingRow = {
  id: number
  name: string
  student_id: string
  seat_grade: string
  selected_seats: string[]
  special_request: string | null
  booking_date: string
  status: string
  created_at: string
  updated_at: string
}

type BookingInsert = {
  id?: never
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

export type ReviewRow = {
  id: number
  musical_id: string
  user_name: string
  password: string | null
  password_hash: string | null
  content: string
  image_url: string | null
  rating: number
  created_at: string
}

export type PublicReviewRow = Pick<ReviewRow, "id" | "musical_id" | "user_name" | "content" | "image_url" | "rating" | "created_at">

export type PresaleAccessKeyRow = {
  id: number
  musical_id: string
  key_hash: string
  label: string | null
  starts_at: string | null
  ends_at: string | null
  max_uses: number | null
  used_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
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
          used_count?: number
          is_active?: boolean
          created_at?: string
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
      book_musical_seats: {
        Args: {
          p_musical_id: string
          p_name: string
          p_student_id: string
          p_seat_grade: string
          p_selected_seats: string[]
          p_special_request: string | null
        }
        Returns: {
          success: boolean
          bookingId?: number
          bookingDate?: string
          conflictSeats?: string[]
          error?: string
        }
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
          p_password: string
          p_content: string
          p_rating: number
          p_image_url: string | null
        }
        Returns: PublicReviewRow
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
      validate_presale_access_key: {
        Args: {
          p_musical_id: string
          p_key: string
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
