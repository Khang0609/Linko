import { z } from "zod"

export const createCompanySchema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự").max(200),
  industryId: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  website: z.string().url("Website không hợp lệ").optional().nullable().or(z.literal("")),
  foundedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  sizeCategory: z.string().max(50).optional().nullable(),
})

export const updateCompanySchema = createCompanySchema.partial().extend({
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]).optional(),
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>
