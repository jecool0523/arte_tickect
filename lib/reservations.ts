import { getMusicalById } from "@/data/musicals"
import type { BookingTicketData } from "@/components/booking-ticket"

export const reservationSources = [
  { id: "dead-poets-society", table: "dead_poets_society_bookings", title: "죽은 시인의 사회" },
  { id: "rent", table: "rent_bookings", title: "RENT" },
  { id: "toctoc", table: "toctoc_bookings", title: "TOC TOC" },
  { id: "legacy", table: "arte_musical_tickets", title: "아르떼 이전 공연" },
] as const

export type ReservationSource = typeof reservationSources[number]
export type Reservation = {
  id: number; name: string; student_id: string; seat_grade: string;
  selected_seats: string[]; booking_date: string; status: string;
  sourceId: ReservationSource["id"]; musicalTitle: string;
}

export function findReservationSource(id: string) {
  return reservationSources.find((source) => source.id === id)
}

export function isTicketReady(status: string) {
  return ["confirmed", "completed"].includes(status.toLowerCase())
}

export function reservationStatusLabel(status: string) {
  if (isTicketReady(status)) return "예매 완료"
  if (["cancelled", "canceled"].includes(status.toLowerCase())) return "취소됨"
  return "예약 확인 중"
}

export function reservationTicketPath(sourceId: ReservationSource["id"], bookingId: number) {
  return `/profile/bookings/${sourceId}/${bookingId}`
}

export function reservationTicketData(booking: Reservation): BookingTicketData {
  const musical = booking.sourceId === "legacy" ? null : getMusicalById(booking.sourceId)
  return {
    bookingId: booking.id, bookingDate: booking.booking_date, name: booking.name,
    studentId: booking.student_id, seatGrade: booking.seat_grade, selectedSeats: booking.selected_seats,
    musicalTitle: musical?.title ?? booking.musicalTitle,
    musicalDate: musical?.date ?? "공연일 정보 없음",
    musicalTime: musical?.time ?? "시간 정보 없음",
    venue: musical?.venue ?? "장소 정보 없음",
  }
}
