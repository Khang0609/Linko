import { z } from "zod"

export const extractedStatSchema = z.object({
  key: z.string(),                         // Phải khớp với định nghĩa StatDefinition.key
  value: z.union([z.string(), z.number(), z.boolean()]),
  confidence: z.number().min(0).max(1).optional().nullable(),
})

export const extractedAttributeSchema = z.object({
  type: z.enum(["STRENGTH", "WEAKNESS", "NEED", "CAPABILITY"]),
  axis: z.enum(["GENERAL", "FINANCE", "WORKFORCE", "PRODUCT", "OPERATIONS"]).default("GENERAL"),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
})

export const extractionResultSchema = z.object({
  stats: z.array(extractedStatSchema).default([]),
  attributes: z.array(extractedAttributeSchema).default([]),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>
