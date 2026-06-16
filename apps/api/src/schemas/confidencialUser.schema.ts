import { z } from "zod";

export const createConfidencialUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
});

export type CreateConfidencialUserInput = z.infer<typeof createConfidencialUserSchema>;
