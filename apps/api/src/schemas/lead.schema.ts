import { z } from "zod";

const referrerSchema = z.object({
  type: z.enum(["USER", "LEAD"]),
  id: z.string().uuid("ID do indicador inválido"),
});

export const createLeadSchema = z.object({
  externalCode: z.string().min(1).optional(),
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().optional(),
  responsavelId: z.string().uuid().optional().nullable(),
  coVendedorId: z.string().uuid().optional().nullable(),
  firstContactId: z.string().uuid().optional().nullable(),
  salesStatusId: z.string().uuid().optional(),
  salesStatusSlug: z.string().optional(),
  notes: z.string().optional(),
  offeredAmount: z.coerce.number().nonnegative().optional().nullable(),
  closedAmount: z.coerce.number().nonnegative().optional().nullable(),
  referrer: referrerSchema.optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  status: z.string().optional(),
  responsavelId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  updatedFrom: z.coerce.date().optional(),
  updatedTo: z.coerce.date().optional(),
  offeredMin: z.coerce.number().nonnegative().optional(),
  offeredMax: z.coerce.number().nonnegative().optional(),
  closedMin: z.coerce.number().nonnegative().optional(),
  closedMax: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const treeQuerySchema = z.object({
  maxDepth: z.coerce.number().int().positive().max(10).default(10),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
