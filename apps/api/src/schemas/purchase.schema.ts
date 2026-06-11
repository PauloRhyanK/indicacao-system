import { z } from "zod";

export const createPurchaseSchema = z
  .object({
    amount: z.coerce.number().positive("Valor deve ser maior que zero"),
    purchaseDate: z.coerce.date().default(() => new Date()),
    consortiumTypeId: z.string().uuid().optional(),
    consortiumTypeSlug: z.string().min(1).optional(),
    coVendedorId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => !(data.consortiumTypeId && data.consortiumTypeSlug), {
    message: "Informe consortiumTypeId ou consortiumTypeSlug, não ambos",
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const updatePurchaseSchema = z
  .object({
    purchaseDate: z.coerce.date().optional(),
    boletoPaid: z.boolean().optional(),
  })
  .refine((data) => data.purchaseDate !== undefined || data.boletoPaid !== undefined, {
    message: "Informe ao menos um campo para atualizar",
  });

export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

export const deletePurchaseSchema = z.object({
  leadStatusSlug: z.string().min(1).default("em-negociacao"),
});

export type DeletePurchaseInput = z.infer<typeof deletePurchaseSchema>;
