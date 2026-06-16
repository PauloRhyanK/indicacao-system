import { z } from "zod";
import {
  RJ_CLASSE_VALUES,
  RJ_MOTIVO_VALUES,
  RJ_STATUS_VALUES,
} from "../constants/rj.js";

const credorBaseSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  sujeito: z.boolean(),
  classe: z.enum(RJ_CLASSE_VALUES).nullable().optional(),
  motivo: z.enum(RJ_MOTIVO_VALUES).nullable().optional(),
  valor: z.number().min(0).default(0),
  status: z.enum(RJ_STATUS_VALUES).default("juridico"),
  contato: z.string().default(""),
  passo: z.string().default(""),
  retorno: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  obs: z.string().default(""),
});

function refineSujeitoClasseMotivo<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as z.infer<typeof credorBaseSchema>;
    if (d.sujeito) {
      if (!d.classe) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Classe é obrigatória para credores sujeitos à RJ",
          path: ["classe"],
        });
      }
    } else if (!d.motivo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Motivo é obrigatório para credores fora da RJ",
        path: ["motivo"],
      });
    }
  });
}

export const createCredorSchema = refineSujeitoClasseMotivo(credorBaseSchema);

export const updateCredorSchema = credorBaseSchema
  .partial()
  .extend({
    nome: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sujeito === true && data.classe === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Classe é obrigatória para credores sujeitos à RJ",
        path: ["classe"],
      });
    }
    if (data.sujeito === false && data.motivo === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Motivo é obrigatório para credores fora da RJ",
        path: ["motivo"],
      });
    }
  });

export const updateCredorStatusSchema = z.object({
  status: z.enum(RJ_STATUS_VALUES),
});

export const updateConfigSchema = z.object({
  passivo: z.number().min(0),
});

export const listRjHistoricoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  entityType: z.enum(["credor", "config", "usuario", "papel"]).optional(),
  entityId: z.string().optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export type CreateCredorInput = z.infer<typeof createCredorSchema>;
export type UpdateCredorInput = z.infer<typeof updateCredorSchema>;
export type UpdateCredorStatusInput = z.infer<typeof updateCredorStatusSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
