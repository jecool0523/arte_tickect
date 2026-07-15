import { NextResponse } from "next/server"

// Retired: this route had no musical period or atomic booking context.
export function GET() {
  return NextResponse.json({ error: "Booking list access is disabled." }, { status: 410 })
}

export function POST() {
  return NextResponse.json({ error: "Use /api/bookings/:musicalId." }, { status: 410 })
}
