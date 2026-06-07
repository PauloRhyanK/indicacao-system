import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roleIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um papel"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const personalDailyTargetSchema = z.object({
  amount: z.number().nonnegative().nullable(),
});
