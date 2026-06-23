import { z } from "zod";
import { RJ_REUNIAO_STATUS_VALUES } from "../constants/rj.js";

export const listReunioesQuerySchema = z.object({
  de: z.string().optional(),
  ate: z.string().optional(),
  credorId: z.string().uuid().optional(),
  userId: z.union([z.string().uuid(), z.literal("all")]).optional(),
  status: z.enum(RJ_REUNIAO_STATUS_VALUES).optional(),
});

export const createReuniaoSchema = z.object({
  credorId: z.string().uuid(),
  titulo: z.string().trim().min(1).optional(),
  dataHoraInicio: z.string().datetime({ offset: true }),
  dataHoraFim: z.string().datetime({ offset: true }).nullable().optional(),
  local: z.string().trim().nullable().optional(),
  linkOnline: z.string().trim().url().nullable().optional().or(z.literal("")),
  pauta: z.string().trim().nullable().optional(),
  participantesIds: z.array(z.string().uuid()).optional(),
  gerarGoogleMeet: z.boolean().optional(),
});

export const updateReuniaoSchema = z.object({
  credorId: z.string().uuid().optional(),
  titulo: z.string().trim().min(1).optional(),
  dataHoraInicio: z.string().datetime({ offset: true }).optional(),
  dataHoraFim: z.string().datetime({ offset: true }).nullable().optional(),
  local: z.string().trim().nullable().optional(),
  linkOnline: z.string().trim().url().nullable().optional().or(z.literal("")),
  pauta: z.string().trim().nullable().optional(),
  resultado: z.string().trim().nullable().optional(),
  status: z.enum(RJ_REUNIAO_STATUS_VALUES).optional(),
  participantesIds: z.array(z.string().uuid()).optional(),
  gerarGoogleMeet: z.boolean().optional(),
});

export const updateReuniaoStatusSchema = z.object({
  status: z.enum(RJ_REUNIAO_STATUS_VALUES),
  resultado: z.string().trim().nullable().optional(),
});

export type ListReunioesQuery = z.infer<typeof listReunioesQuerySchema>;
export type CreateReuniaoInput = z.infer<typeof createReuniaoSchema>;
export type UpdateReuniaoInput = z.infer<typeof updateReuniaoSchema>;
export type UpdateReuniaoStatusInput = z.infer<typeof updateReuniaoStatusSchema>;
