import type { Database, Tables } from "@/types/supabase"

export const DEFAULT_MUSICAL_ID = "dead-poets-society"

export const MUSICAL_DATABASE_CONFIG = {
  "dead-poets-society": {
    bookingTable: "dead_poets_society_bookings",
  },
  rent: {
    bookingTable: "rent_bookings",
  },
  toctoc: {
    bookingTable: "toctoc_bookings",
  },
} as const

export const FLOOR_1 = "1\uce35"
export const FLOOR_2 = "2\uce35"
export const GRADE_VIP = "VIP"
export const GRADE_R = "R\uc11d"
export const GRADE_S = "S\uc11d"

export type MusicalId = keyof typeof MUSICAL_DATABASE_CONFIG
export type BookingTableName = (typeof MUSICAL_DATABASE_CONFIG)[MusicalId]["bookingTable"]
export type LegacyBookingTableName = "arte_musical_tickets"
export type AnyBookingTableName = BookingTableName | LegacyBookingTableName
export type BookingRow = Tables<AnyBookingTableName>

export type SeatFloor = typeof FLOOR_1 | typeof FLOOR_2
export type SeatGradeCode = typeof GRADE_VIP | typeof GRADE_R | typeof GRADE_S
export type UnavailableSeats = Record<SeatFloor, Record<string, string[]>>

export type SeatStatistics = {
  total_bookings: number
  total_seats_booked: number
  unique_students: number
}

export const EMPTY_SEAT_STATISTICS: SeatStatistics = {
  total_bookings: 0,
  total_seats_booked: 0,
  unique_students: 0,
}

export function isKnownMusicalId(musicalId: string): musicalId is MusicalId {
  return musicalId in MUSICAL_DATABASE_CONFIG
}

export function getBookingTableName(musicalId: string): BookingTableName | null {
  return isKnownMusicalId(musicalId) ? MUSICAL_DATABASE_CONFIG[musicalId].bookingTable : null
}

export function createEmptyUnavailableSeats(): UnavailableSeats {
  return {
    [FLOOR_1]: {
      [GRADE_VIP]: [],
      [GRADE_R]: [],
    },
    [FLOOR_2]: {
      [GRADE_S]: [],
    },
  }
}

export function normalizeSeatGrade(grade: string | null | undefined): SeatGradeCode | null {
  if (grade === GRADE_VIP) return GRADE_VIP
  if (grade === "R" || grade === GRADE_R) return GRADE_R
  if (grade === "S" || grade === GRADE_S) return GRADE_S
  return null
}

export function getSeatFloor(seatId: string): SeatFloor | null {
  if (seatId.startsWith("F1-")) return FLOOR_1
  if (seatId.startsWith("F2-")) return FLOOR_2
  if (seatId.startsWith(FLOOR_1)) return FLOOR_1
  if (seatId.startsWith(FLOOR_2)) return FLOOR_2
  return null
}

export function addUnavailableSeat(unavailableSeats: UnavailableSeats, seatId: string, grade: string | null | undefined) {
  const floor = getSeatFloor(seatId)
  const normalizedGrade = normalizeSeatGrade(grade)

  if (!floor || !normalizedGrade) return

  const floorSeats = unavailableSeats[floor]
  const gradeSeats = floorSeats[normalizedGrade] ?? []
  gradeSeats.push(seatId)
  floorSeats[normalizedGrade] = gradeSeats
}

export function buildUnavailableSeats(bookings: Pick<BookingRow, "seat_grade" | "selected_seats">[] | null | undefined) {
  const unavailableSeats = createEmptyUnavailableSeats()

  bookings?.forEach((booking) => {
    booking.selected_seats?.forEach((seatId) => {
      addUnavailableSeat(unavailableSeats, seatId, booking.seat_grade)
    })
  })

  return unavailableSeats
}

export function summarizeBookings(bookings: Pick<BookingRow, "selected_seats" | "student_id">[] | null | undefined): SeatStatistics {
  if (!bookings?.length) return EMPTY_SEAT_STATISTICS

  return {
    total_bookings: bookings.length,
    total_seats_booked: bookings.reduce((sum, booking) => sum + (booking.selected_seats?.length ?? 0), 0),
    unique_students: new Set(bookings.map((booking) => booking.student_id)).size,
  }
}

export type BookingTableSchema = Database["public"]["Tables"][AnyBookingTableName]
