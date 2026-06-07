import { z } from "zod";

export const createPurchaseSchema = z
  .object({
    amount: z.coerce.number().positive("Valor deve ser maior que zero"),
    purchaseDate: z.coerce.date().default(() => new Date()),
    consortiumTypeId: z.string().uuid().optional(),
    consortiumTypeSlug: z.string().min(1).optional(),
  })
  .refine((data) => !(data.consortiumTypeId && data.consortiumTypeSlug), {
    message: "Informe consortiumTypeId ou consortiumTypeSlug, não ambos",
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
