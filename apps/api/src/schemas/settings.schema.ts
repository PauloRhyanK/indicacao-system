import { z } from "zod";

export const createLookupSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z.string().min(1).optional(),
});

export const updateLookupSchema = z.object({
  name: z.string().min(1).optional(),
});

export type CreateLookupInput = z.infer<typeof createLookupSchema>;
export type UpdateLookupInput = z.infer<typeof updateLookupSchema>;
