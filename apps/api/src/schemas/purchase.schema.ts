import { z } from "zod";

export const createPurchaseSchema = z.object({
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  purchaseDate: z.coerce.date().default(() => new Date()),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
