import type { BookingTicketData } from "@/components/booking-ticket"

export type BookingAttendee = {
  name: string
  studentId: string
}

export type BookingDraft = {
  musicalId: string
  name: string
  studentId: string
  seatGrade: string
  selectedSeats: string[]
  attendees: BookingAttendee[]
  specialRequest: string
  userMemo: string
  accessGranted: boolean
}

export type BookingCompletion = {
  ticket: BookingTicketData
  shareToken: string | null
}

export const BOOKING_DRAFTS_STORAGE_KEY = "arte-booking-drafts:v1"
export const BOOKING_COMPLETIONS_STORAGE_KEY = "arte-booking-completions:v1"

export function createEmptyBookingDraft(musicalId: string): BookingDraft {
  return {
    musicalId,
    name: "",
    studentId: "",
    seatGrade: "",
    selectedSeats: [],
    attendees: [],
    specialRequest: "",
    userMemo: "",
    accessGranted: false,
  }
}

export function normalizeBookingDraft(musicalId: string, value: unknown): BookingDraft {
  const empty = createEmptyBookingDraft(musicalId)
  if (!value || typeof value !== "object") return empty

  const draft = value as Partial<BookingDraft>
  const attendees = Array.isArray(draft.attendees)
    ? draft.attendees.map((attendee) => ({
        name: typeof attendee?.name === "string" ? attendee.name : "",
        studentId: typeof attendee?.studentId === "string" ? attendee.studentId : "",
      }))
    : []

  return {
    ...empty,
    name: typeof draft.name === "string" ? draft.name : "",
    studentId: typeof draft.studentId === "string" ? draft.studentId : "",
    seatGrade: typeof draft.seatGrade === "string" ? draft.seatGrade : "",
    selectedSeats: Array.isArray(draft.selectedSeats)
      ? draft.selectedSeats.filter((seat): seat is string => typeof seat === "string")
      : [],
    attendees,
    specialRequest: typeof draft.specialRequest === "string" ? draft.specialRequest : "",
    userMemo: typeof draft.userMemo === "string" ? draft.userMemo : "",
    accessGranted: draft.accessGranted === true,
  }
}

// No-op updates must preserve references used by BookingForm's effects.
export function isSameBookingDraft(left: BookingDraft, right: BookingDraft): boolean {
  return left.musicalId === right.musicalId
    && left.name === right.name
    && left.studentId === right.studentId
    && left.seatGrade === right.seatGrade
    && left.specialRequest === right.specialRequest
    && left.userMemo === right.userMemo
    && left.accessGranted === right.accessGranted
    && left.selectedSeats.length === right.selectedSeats.length
    && left.selectedSeats.every((seat, index) => seat === right.selectedSeats[index])
    && left.attendees.length === right.attendees.length
    && left.attendees.every((attendee, index) => attendee.name === right.attendees[index].name
      && attendee.studentId === right.attendees[index].studentId)
}
