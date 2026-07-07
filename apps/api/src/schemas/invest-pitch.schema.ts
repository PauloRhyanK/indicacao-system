import { z } from "zod";
import { INVEST_FAIXA_VALUES } from "../constants/invest.js";

// Objeção: par pergunta (do cliente) → resposta (contorno).
const objecaoSchema = z.object({
  q: z.string().default(""),
  a: z.string().default(""),
});

// Etapa 1 — SDR (objetivo: marcar a reunião).
const sdrSchema = z.object({
  missao: z.string().default(""),
  aberturaLigacao: z.string().default(""),
  qualificacao: z.array(z.string()).default([]),
  objecoes: z.array(objecaoSchema).default([]),
  fechamentoAgenda: z.string().default(""),
});

// Etapa 2 — Assessor (objetivo: conduzir a reunião e fechar o próximo passo).
const assessorSchema = z.object({
  preparacao: z.array(z.string()).default([]),
  aberturaReuniao: z.string().default(""),
  descoberta: z.array(z.string()).default([]),
  racional: z.string().default(""),
  arsenal: z.array(z.string()).default([]),
  objecoes: z.array(objecaoSchema).default([]),
  proximoPasso: z.string().default(""),
});

export const investPitchConteudoSchema = z.object({
  sdr: sdrSchema.default({}),
  assessor: assessorSchema.default({}),
});

export type InvestPitchConteudo = z.infer<typeof investPitchConteudoSchema>;

const investPitchBaseSchema = z.object({
  faixa: z.enum(INVEST_FAIXA_VALUES),
  titulo: z.string().trim().min(1, "Título é obrigatório"),
  gancho: z.string().default(""),
  padraoDoSegmento: z.boolean().default(false),
  ativo: z.boolean().default(true),
  conteudo: investPitchConteudoSchema.default({}),
});

export const createInvestPitchSchema = investPitchBaseSchema;

export const updateInvestPitchSchema = investPitchBaseSchema.partial().extend({
  titulo: z.string().trim().min(1).optional(),
});

export const listInvestPitchesQuerySchema = z.object({
  faixa: z.enum(INVEST_FAIXA_VALUES).optional(),
  ativo: z.coerce.boolean().optional(),
  q: z.string().optional(),
});

export type CreateInvestPitchInput = z.infer<typeof createInvestPitchSchema>;
export type UpdateInvestPitchInput = z.infer<typeof updateInvestPitchSchema>;
export type ListInvestPitchesQuery = z.infer<typeof listInvestPitchesQuerySchema>;
