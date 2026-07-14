import { z } from "zod";
import {
  INVEST_FAIXA_VALUES,
  INVEST_ORIGEM_VALUES,
  INVEST_PRODUTO_VALUES,
} from "../constants/invest.js";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

export const investClientesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().optional(),
  assessor: z.string().optional(),
  faixa: z.enum(INVEST_FAIXA_VALUES).optional(),
  status: z.enum(["novo", "convertido", "all"]).optional().default("all"),
});

export type InvestClientesQuery = z.infer<typeof investClientesQuerySchema>;

export const investBtgImportRowSchema = z.object({
  conta: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  btgClienteId: z.string().optional().default(""),
  email: z.string().optional().default(""),
  assessorNome: z.string().optional().default(""),
  assessorEmail: z.string().optional().default(""),
  plTotal: z.union([z.number(), z.string()]).optional(),
  plDeclarado: z.union([z.number(), z.string()]).optional(),
  faixaBtg: z.string().optional().default(""),
  cidade: z.string().optional().default(""),
  estado: z.string().optional().default(""),
  profissao: z.string().optional().default(""),
  tipoInvestidor: z.string().optional().default(""),
  dadosExtras: z.record(z.unknown()).optional().default({}),
});

export const importInvestClientesSchema = z.object({
  rows: z.array(investBtgImportRowSchema).min(1).max(5000),
  aliases: z
    .array(
      z.object({
        aliasRaw: z.string(),
        action: z.enum(["map", "create"]).default("map"),
        userId: z.string().uuid().optional(),
        createName: z.string().optional(),
      }),
    )
    .optional(),
});

export const convertInvestClienteSchema = z.object({
  nome: z.string().trim().min(1),
  origem: z.enum(INVEST_ORIGEM_VALUES).default("btg"),
  produto: z.enum(INVEST_PRODUTO_VALUES).default("carteira"),
  pitch: z.string().default(""),
  pitchId: z.string().uuid().nullable().optional(),
  pl: z.number().min(0).default(0),
  faixa: z.enum(INVEST_FAIXA_VALUES).nullable().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  responsavelNome: z.string().default(""),
  celular: z.string().default(""),
  contato: z.string().default(""),
  passo: z.string().default(""),
  retorno: dateStr,
  obs: z.string().default(""),
});

export type InvestBtgImportRow = z.infer<typeof investBtgImportRowSchema>;
export type ImportInvestClientesInput = z.infer<typeof importInvestClientesSchema>;
export type ConvertInvestClienteInput = z.infer<typeof convertInvestClienteSchema>;
