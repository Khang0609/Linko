import { z } from "zod"

export const createLinkSchema = z.object({
  companyId: z.string(), // Sử dụng chuỗi định dạng chung (Prisma model dùng String làm id)
  linkUrl: z.string().url("Link không hợp lệ"),
})

export const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "image/png",
  "image/jpeg",
  "text/plain",
] as const

export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB
