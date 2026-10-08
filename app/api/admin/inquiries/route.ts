import { type NextRequest } from "next/server"
import { handleSupportRequest } from "@/lib/server/support-request"
export const dynamic = "force-dynamic"
export const revalidate = 0
export function GET(request: NextRequest) { return handleSupportRequest(request, true, false) }
export function PATCH(request: NextRequest) { return handleSupportRequest(request, true, true) }
