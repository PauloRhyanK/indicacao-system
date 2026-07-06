import { z } from "zod";
import {
  INVEST_ETAPA_VALUES,
  INVEST_FAIXA_VALUES,
  INVEST_ORIGEM_VALUES,
  INVEST_PRODUTO_VALUES,
} from "../constants/invest.js";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const investLeadBaseSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  origem: z.enum(INVEST_ORIGEM_VALUES).default("outro"),
  produto: z.enum(INVEST_PRODUTO_VALUES).default("carteira"),
  pitch: z.string().default(""),
  pl: z.number().min(0).default(0),
  etapa: z.enum(INVEST_ETAPA_VALUES).default("lead"),
  probabilidade: z.number().int().min(0).max(100).optional(),
  faixa: z.enum(INVEST_FAIXA_VALUES).nullable().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  responsavelNome: z.string().default(""),
  indicadoPor: z.string().default(""),
  celular: z.string().default(""),
  contato: z.string().default(""),
  passo: z.string().default(""),
  retorno: dateStr,
  obs: z.string().default(""),
});

export const createInvestLeadSchema = investLeadBaseSchema;

export const updateInvestLeadSchema = investLeadBaseSchema.partial().extend({
  nome: z.string().trim().min(1).optional(),
});

export const updateInvestEtapaSchema = z.object({
  etapa: z.enum(INVEST_ETAPA_VALUES),
});

export const updateInvestConfigSchema = z.object({
  meta: z.number().min(0),
});

/**
 * Linha crua da planilha (colunas BASE: Lead, Origem, Produto, Pitch, PL,
 * Etapa, Probabilidade, Responsavel, Contato, Proximo passo, Retorno,
 * Observacoes). Valores chegam como o Excel entrega — o serviço normaliza
 * rótulos, frações e datas seriais.
 */
export const investImportRowSchema = z.object({
  nome: z.string().trim().min(1),
  origem: z.string().optional().default(""),
  produto: z.string().optional().default(""),
  pitch: z.string().optional().default(""),
  pl: z.union([z.number(), z.string()]).optional(),
  etapa: z.string().optional().default(""),
  probabilidade: z.union([z.number(), z.string()]).optional(),
  faixa: z.string().optional().default(""),
  responsavel: z.string().optional().default(""),
  indicadoPor: z.string().optional().default(""),
  celular: z.union([z.number(), z.string()]).optional(),
  contato: z.union([z.number(), z.string()]).optional(),
  passo: z.string().optional().default(""),
  retorno: z.union([z.number(), z.string()]).optional(),
  obs: z.string().optional().default(""),
});

export const importInvestLeadsSchema = z.object({
  rows: z.array(investImportRowSchema).min(1).max(5000),
});

export type CreateInvestLeadInput = z.infer<typeof createInvestLeadSchema>;
export type UpdateInvestLeadInput = z.infer<typeof updateInvestLeadSchema>;
export type UpdateInvestEtapaInput = z.infer<typeof updateInvestEtapaSchema>;
export type UpdateInvestConfigInput = z.infer<typeof updateInvestConfigSchema>;
export type InvestImportRow = z.infer<typeof investImportRowSchema>;
export type ImportInvestLeadsInput = z.infer<typeof importInvestLeadsSchema>;
