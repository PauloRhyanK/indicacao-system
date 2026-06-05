import { z } from "zod";

export const updateGoalSchema = z
  .object({
    targetAmount: z.coerce.number().nonnegative().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
