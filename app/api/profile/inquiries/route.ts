import { type NextRequest } from "next/server"
import { handleSupportRequest } from "@/lib/server/support-request"
export const dynamic = "force-dynamic"
export const revalidate = 0
export function GET(request: NextRequest) { return handleSupportRequest(request, false, false) }
export function POST(request: NextRequest) { return handleSupportRequest(request, false, true) }
