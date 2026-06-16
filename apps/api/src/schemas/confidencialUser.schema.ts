import { z } from "zod";

export const createConfidencialUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type CreateConfidencialUserInput = z.infer<typeof createConfidencialUserSchema>;
