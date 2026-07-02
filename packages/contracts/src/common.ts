import { z } from 'zod';

export const BusinessErrorItemSchema = z.object({
  code: z.string(),
  field: z.string(),
  value: z.unknown().nullable().optional(),
  message: z.string(),
});

export const ValidationErrorItemSchema = z.object({
  field: z.string(),
  message: z.string(),
  type: z.string(),
  context: z.record(z.string(), z.string()).optional(),
});

export const ProblemErrorSchema = z.union([BusinessErrorItemSchema, ValidationErrorItemSchema]);

export const ProblemDetailSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
  errors: z.array(ProblemErrorSchema).optional(),
});

export type BusinessErrorItem = z.infer<typeof BusinessErrorItemSchema>;
export type ValidationErrorItem = z.infer<typeof ValidationErrorItemSchema>;
export type ProblemError = z.infer<typeof ProblemErrorSchema>;
export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
