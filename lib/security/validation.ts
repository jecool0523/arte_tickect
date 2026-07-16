import { z } from "zod"
import { isKnownMusicalId, normalizeSeatGrade } from "@/lib/musical-config"
import { getSeatRows, SEAT_SECTIONS } from "@/lib/seat-map"

export const MAX_BOOKING_SEATS = 10

const validSeats = new Map(
  SEAT_SECTIONS.flatMap((section) =>
    getSeatRows(section).flatMap(({ areas }) =>
      areas.flatMap(({ seats }) => seats.map((seat) => [seat.id, seat.grade] as const)),
    ),
  ),
)

const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max)

export const bookingRequestSchema = z
  .object({
    name: trimmedString(1, 100),
    studentId: trimmedString(1, 20).regex(/^[A-Za-z0-9_-]+$/),
    seatGrade: trimmedString(1, 10),
    selectedSeats: z.array(trimmedString(1, 40)).min(1).max(MAX_BOOKING_SEATS),
    specialRequest: z.string().trim().max(500).optional().default(""),
    presaleKey: z.string().trim().max(128).optional().default(""),
  })
  .superRefine((value, context) => {
    if (new Set(value.selectedSeats).size !== value.selectedSeats.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedSeats"], message: "Duplicate seats are not allowed." })
    }

    const normalizedGrade = normalizeSeatGrade(value.seatGrade)
    if (!normalizedGrade) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["seatGrade"], message: "Unknown seat grade." })
      return
    }

    for (const seatId of value.selectedSeats) {
      if (validSeats.get(seatId) !== normalizedGrade) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedSeats"], message: "Seat does not match the seat map and grade." })
      }
    }
  })

export const shareTokenLookupSchema = z.object({
  shareToken: trimmedString(32, 1024),
})

export const presaleValidationSchema = z.object({
  musicalId: z.string().trim().refine(isKnownMusicalId),
  presaleKey: trimmedString(8, 128),
})

export const bookingVerificationSchema = z.object({
  musicalId: z.string().trim().refine(isKnownMusicalId),
  name: trimmedString(1, 100),
  studentId: trimmedString(1, 20).regex(/^[A-Za-z0-9_-]+$/),
})

export const createReviewSchema = z.object({
  musicalId: z.string().trim().refine(isKnownMusicalId),
  name: trimmedString(1, 80),
  content: trimmedString(1, 2_000),
  rating: z.coerce.number().int().min(1).max(5),
  imageUrl: z.string().trim().max(4_096).nullable().optional(),
})

export const deleteReviewSchema = z.object({
  deletionToken: trimmedString(32, 256),
})

export function isAllowedReviewMediaUrl(value: string | null | undefined, publicBaseUrl: string) {
  if (!value) return true

  let urls: unknown
  try {
    urls = JSON.parse(value)
  } catch {
    return false
  }

  if (!Array.isArray(urls) || urls.length > 4) return false
  return urls.every((url) => typeof url === "string" && url.startsWith(`${publicBaseUrl}/storage/v1/object/public/review-images/`))
}
