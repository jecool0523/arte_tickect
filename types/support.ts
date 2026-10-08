export type SupportInquiry = {
  id: string
  content: string
  createdAt: string
  reply: string | null
  repliedAt: string | null
  displayName?: string
  studentId?: string | null
}

export type SupportInquiryPage = {
  success: boolean
  code?: string
  inquiries: SupportInquiry[]
  total: number
}
