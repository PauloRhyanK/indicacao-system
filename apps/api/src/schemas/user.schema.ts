import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "CONSULTANT"]).default("CONSULTANT"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
