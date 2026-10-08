export type MembershipState = {
  eligible: boolean
  status: "unanswered" | "declined" | "pending" | "approved" | "rejected" | "admin" | "profile_incomplete" | "not_eligible"
  manualStudentCheck?: boolean
}
export type AdminMembershipRequest = {
  id: string
  email: string
  displayName: string
  studentId: string
  requestedAt: string
  manualStudentCheck: boolean
  profileUnchanged: boolean
  alreadyAdmin: boolean
}
