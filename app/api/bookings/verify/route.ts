import { NextResponse } from "next/server"

// Name + student ID is not an authenticator. Ticket access uses the expiring
// signed share token returned at booking time instead.
export function POST() {
  return NextResponse.json(
    { error: "Name and student ID lookup is disabled. Use the expiring ticket share link." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}
