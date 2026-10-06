import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { findReservationSource, reservationSources, type Reservation } from "@/lib/reservations"

type AuthClient = SupabaseClient<Database>

// Use the verified session client: explicit ownership filters AND existing owner-only RLS.
export async function getOwnedReservations(client: AuthClient, userId: string) {
  const results = await Promise.all(reservationSources.map((source) => client.from(source.table)
    .select("id, name, student_id, booking_date, seat_grade, selected_seats, status")
    .eq("user_id", userId).order("booking_date", { ascending: false })))
  const reservations: Reservation[] = results.flatMap((result, index) => (result.data ?? []).map((row) => ({
    ...row, sourceId: reservationSources[index].id, musicalTitle: reservationSources[index].title,
  }))).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
  return { reservations, unavailable: results.some((result) => result.error) }
}

export async function getOwnedReservation(client: AuthClient, userId: string, sourceId: string, bookingId: string) {
  const source = findReservationSource(sourceId)
  if (!source || !/^[1-9][0-9]*$/.test(bookingId) || !Number.isSafeInteger(Number(bookingId))) return null
  const { data, error } = await client.from(source.table)
    .select("id, name, student_id, booking_date, seat_grade, selected_seats, status")
    .eq("user_id", userId).eq("id", Number(bookingId)).maybeSingle()
  if (error) throw new Error("Reservation is temporarily unavailable")
  return data ? { ...data, sourceId: source.id, musicalTitle: source.title } satisfies Reservation : null
}
