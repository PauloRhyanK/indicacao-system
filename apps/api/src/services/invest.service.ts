import { Prisma, type InvestLead } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  INVEST_ETAPA_DEFAULT_PROB,
  INVEST_ETAPA_LABELS,
  INVEST_ETAPA_VALUES,
  INVEST_FAIXA_LABELS,
  INVEST_FAIXA_VALUES,
  INVEST_ORIGEM_LABELS,
  INVEST_ORIGEM_VALUES,
  INVEST_PRODUTO_LABELS,
  INVEST_PRODUTO_VALUES,
  faixaFromPl,
  type InvestEtapa,
  type InvestFaixa,
  type InvestOrigem,
  type InvestProduto,
} from "../constants/invest.js";
import { notFound } from "../utils/httpError.js";
import { normalizeText } from "../utils/slugify.js";
import type {
  CreateInvestLeadInput,
  InvestImportRow,
  UpdateInvestConfigInput,
  UpdateInvestEtapaInput,
  UpdateInvestLeadInput,
} from "../schemas/invest.schema.js";

const activeWhere = { deletedAt: null } as const;

const includeResponsavel = {
  responsavel: { select: { id: true, name: true } },
} as const;

type InvestLeadWithUser = InvestLead & {
  responsavel: { id: string; name: string } | null;
};

function serializeInvestLead(lead: InvestLeadWithUser) {
  return {
    id: lead.id,
    nome: lead.nome,
    origem: lead.origem,
    produto: lead.produto,
    pitch: lead.pitch,
    pl: Number(lead.pl),
    etapa: lead.etapa,
    probabilidade: lead.probabilidade,
    faixa: lead.faixa,
    responsavel: lead.responsavel,
    responsavel_nome: lead.responsavel?.name ?? lead.responsavelNome,
    indicado_por: lead.indicadoPor,
    celular: lead.celular,
    contato: lead.contato,
    passo: lead.passo,
    retorno: lead.retorno ? lead.retorno.toISOString().slice(0, 10) : null,
    obs: lead.obs,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

export type SerializedInvestLead = ReturnType<typeof serializeInvestLead>;

function parseRetorno(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function defaultProb(etapa: InvestEtapa): number {
  return INVEST_ETAPA_DEFAULT_PROB[etapa];
}

function normalizeFaixa(raw: string | null | undefined): InvestFaixa | null {
  if (!raw) return null;
  const key = normalizeText(raw);
  return (
    INVEST_FAIXA_VALUES.find(
      (f) => f === key || normalizeText(INVEST_FAIXA_LABELS[f]) === key,
    ) ?? null
  );
}

export async function listInvestLeads() {
  const [leads, config] = await Promise.all([
    prisma.investLead.findMany({
      where: activeWhere,
      include: includeResponsavel,
      orderBy: [{ pl: "desc" }, { nome: "asc" }],
    }),
    getInvestConfig(),
  ]);

  return { leads: leads.map(serializeInvestLead), config };
}

export async function createInvestLead(input: CreateInvestLeadInput, actorUserId?: string) {
  const created = await prisma.investLead.create({
    data: {
      nome: input.nome,
      origem: input.origem,
      produto: input.produto,
      pitch: input.pitch,
      pl: new Prisma.Decimal(input.pl),
      etapa: input.etapa,
      probabilidade: input.probabilidade ?? defaultProb(input.etapa),
      faixa: normalizeFaixa(input.faixa) ?? faixaFromPl(input.pl),
      responsavelId: input.responsavelId ?? null,
      responsavelNome: input.responsavelNome,
      indicadoPor: input.indicadoPor,
      celular: input.celular,
      contato: input.contato,
      passo: input.passo,
      retorno: parseRetorno(input.retorno),
      obs: input.obs,
      createdById: actorUserId ?? null,
    },
    include: includeResponsavel,
  });

  return serializeInvestLead(created);
}

async function findActiveInvestLead(id: string) {
  return prisma.investLead.findFirst({ where: { id, ...activeWhere } });
}

export async function updateInvestLead(id: string, input: UpdateInvestLeadInput) {
  const existing = await findActiveInvestLead(id);
  if (!existing) throw notFound("Lead não encontrado");

  const updated = await prisma.investLead.update({
    where: { id },
    data: {
      ...(input.nome !== undefined ? { nome: input.nome } : {}),
      ...(input.origem !== undefined ? { origem: input.origem } : {}),
      ...(input.produto !== undefined ? { produto: input.produto } : {}),
      ...(input.pitch !== undefined ? { pitch: input.pitch } : {}),
      ...(input.pl !== undefined ? { pl: new Prisma.Decimal(input.pl) } : {}),
      ...(input.etapa !== undefined ? { etapa: input.etapa } : {}),
      // Probabilidade é manual por lead (decisão do gestor): só muda quando enviada.
      ...(input.probabilidade !== undefined ? { probabilidade: input.probabilidade } : {}),
      ...(input.faixa !== undefined ? { faixa: normalizeFaixa(input.faixa) } : {}),
      ...(input.responsavelId !== undefined ? { responsavelId: input.responsavelId } : {}),
      ...(input.responsavelNome !== undefined ? { responsavelNome: input.responsavelNome } : {}),
      ...(input.indicadoPor !== undefined ? { indicadoPor: input.indicadoPor } : {}),
      ...(input.celular !== undefined ? { celular: input.celular } : {}),
      ...(input.contato !== undefined ? { contato: input.contato } : {}),
      ...(input.passo !== undefined ? { passo: input.passo } : {}),
      ...(input.retorno !== undefined ? { retorno: parseRetorno(input.retorno) } : {}),
      ...(input.obs !== undefined ? { obs: input.obs } : {}),
    },
    include: includeResponsavel,
  });

  return serializeInvestLead(updated);
}

export async function updateInvestEtapa(id: string, input: UpdateInvestEtapaInput) {
  const existing = await findActiveInvestLead(id);
  if (!existing) throw notFound("Lead não encontrado");
  if (existing.etapa === input.etapa) {
    const current = await prisma.investLead.findUniqueOrThrow({
      where: { id },
      include: includeResponsavel,
    });
    return serializeInvestLead(current);
  }

  // Probabilidade é manual por lead: mover de etapa (kanban) não a altera.
  const updated = await prisma.investLead.update({
    where: { id },
    data: { etapa: input.etapa },
    include: includeResponsavel,
  });

  return serializeInvestLead(updated);
}

export async function softDeleteInvestLead(id: string) {
  const existing = await findActiveInvestLead(id);
  if (!existing) throw notFound("Lead não encontrado");
  await prisma.investLead.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getInvestConfig() {
  const config = await prisma.investConfig.findUnique({ where: { id: "singleton" } });
  return { meta: config ? Number(config.meta) : 0 };
}

export async function updateInvestConfig(input: UpdateInvestConfigInput) {
  const config = await prisma.investConfig.upsert({
    where: { id: "singleton" },
    update: { meta: new Prisma.Decimal(input.meta) },
    create: { id: "singleton", meta: new Prisma.Decimal(input.meta) },
  });
  return { meta: Number(config.meta) };
}

// ---------------------------------------------------------------------------
// Importação da planilha (colunas BASE — Lead, Origem, Produto, Pitch, PL,
// Etapa, Probabilidade, Responsavel, Contato, Proximo passo, Retorno, Obs)
// ---------------------------------------------------------------------------

function buildLabelLookup(
  values: readonly string[],
  labels: Record<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const slug of values) {
    map.set(normalizeText(slug), slug);
    map.set(normalizeText(labels[slug]), slug);
  }
  return map;
}

const origemLookup = buildLabelLookup(INVEST_ORIGEM_VALUES, INVEST_ORIGEM_LABELS);
const produtoLookup = buildLabelLookup(INVEST_PRODUTO_VALUES, INVEST_PRODUTO_LABELS);
const etapaLookup = buildLabelLookup(INVEST_ETAPA_VALUES, INVEST_ETAPA_LABELS);

function normalizeOrigem(raw: string): InvestOrigem {
  return (origemLookup.get(normalizeText(raw)) as InvestOrigem) ?? "outro";
}

function normalizeProduto(raw: string): InvestProduto {
  return (produtoLookup.get(normalizeText(raw)) as InvestProduto) ?? "carteira";
}

function normalizeEtapa(raw: string): InvestEtapa {
  return (etapaLookup.get(normalizeText(raw)) as InvestEtapa) ?? "lead";
}

function parseNumberBr(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 0,25 → 25; 25 → 25. */
function normalizeProbabilidade(value: number | string | undefined, etapa: InvestEtapa): number {
  if (value === undefined || value === null || value === "") return defaultProb(etapa);
  const num = typeof value === "number" ? value : parseNumberBr(value);
  const pct = num > 0 && num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Aceita serial do Excel (dias desde 1899-12-30), yyyy-mm-dd e dd/mm/yyyy. */
function normalizeRetorno(value: number | string | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 20000 || value > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseRetorno(trimmed);
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return parseRetorno(`${br[3]}-${br[2]}-${br[1]}`);
  return null;
}

export interface InvestImportReport {
  total: number;
  created: number;
  updated: number;
  responsaveisNaoMapeados: string[];
}

export async function importInvestLeads(
  rows: InvestImportRow[],
  actorUserId?: string,
): Promise<InvestImportReport> {
  // Resolve responsáveis fora da transação: alias primeiro, depois nome normalizado.
  const [aliases, users] = await Promise.all([
    prisma.userAlias.findMany({
      include: { user: { select: { id: true, deletedAt: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  const userByKey = new Map<string, string>();
  for (const u of users) userByKey.set(normalizeText(u.name), u.id);
  for (const a of aliases) {
    if (!a.user.deletedAt) userByKey.set(a.aliasNormalized, a.user.id);
  }

  const existing = await prisma.investLead.findMany({ where: activeWhere });
  const existingByNome = new Map<string, InvestLead>();
  for (const lead of existing) existingByNome.set(normalizeText(lead.nome), lead);

  const report: InvestImportReport = {
    total: rows.length,
    created: 0,
    updated: 0,
    responsaveisNaoMapeados: [],
  };
  const unmatched = new Set<string>();
  const seenInBatch = new Map<string, string>(); // nome normalizado → id criado no lote

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const nomeKey = normalizeText(row.nome);
      const etapa = normalizeEtapa(row.etapa ?? "");
      const respRaw = (row.responsavel ?? "").trim();
      const responsavelId = respRaw ? (userByKey.get(normalizeText(respRaw)) ?? null) : null;
      if (respRaw && !responsavelId) unmatched.add(respRaw);

      const plNum = parseNumberBr(row.pl);
      const data = {
        origem: normalizeOrigem(row.origem ?? ""),
        produto: normalizeProduto(row.produto ?? ""),
        pitch: (row.pitch ?? "").trim(),
        pl: new Prisma.Decimal(plNum),
        etapa,
        probabilidade: normalizeProbabilidade(row.probabilidade, etapa),
        faixa: normalizeFaixa(row.faixa) ?? faixaFromPl(plNum),
        responsavelId,
        responsavelNome: responsavelId ? "" : respRaw,
        indicadoPor: (row.indicadoPor ?? "").trim(),
        celular: String(row.celular ?? "").trim(),
        contato: String(row.contato ?? "").trim(),
        passo: (row.passo ?? "").trim(),
        retorno: normalizeRetorno(row.retorno),
        obs: (row.obs ?? "").trim(),
      };

      const duplicateId = seenInBatch.get(nomeKey) ?? existingByNome.get(nomeKey)?.id;
      if (duplicateId) {
        // Dedup por nome: atualiza o registro existente em vez de duplicar.
        await tx.investLead.update({ where: { id: duplicateId }, data });
        report.updated += 1;
      } else {
        const created = await tx.investLead.create({
          data: { nome: row.nome.trim(), ...data, createdById: actorUserId ?? null },
        });
        seenInBatch.set(nomeKey, created.id);
        report.created += 1;
      }
    }
  });

  report.responsaveisNaoMapeados = [...unmatched].sort();
  return report;
}

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

function csvCell(value: string | number): string {
  let str = String(value ?? "");
  // Neutraliza CSV/formula injection (Excel/Sheets) em campos livres do lead.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function exportInvestLeadsCsv(): Promise<string> {
  const leads = await prisma.investLead.findMany({
    where: activeWhere,
    include: includeResponsavel,
    orderBy: [{ pl: "desc" }, { nome: "asc" }],
  });

  const header = [
    "Lead",
    "Origem",
    "Produto",
    "Pitch",
    "PL",
    "Faixa",
    "Etapa",
    "Probabilidade (%)",
    "Previsão",
    "Responsável",
    "Contato",
    "Próximo passo",
    "Retorno",
    "Observações",
  ];

  const lines = leads.map((l) => {
    const pl = Number(l.pl);
    const previsao =
      l.etapa === "ganho" ? pl : l.etapa === "perdido" ? 0 : (pl * l.probabilidade) / 100;
    return [
      l.nome,
      INVEST_ORIGEM_LABELS[l.origem as InvestOrigem] ?? l.origem,
      INVEST_PRODUTO_LABELS[l.produto as InvestProduto] ?? l.produto,
      l.pitch,
      pl,
      l.faixa ? INVEST_FAIXA_LABELS[l.faixa as InvestFaixa] ?? l.faixa : "",
      INVEST_ETAPA_LABELS[l.etapa as InvestEtapa] ?? l.etapa,
      l.probabilidade,
      Math.round(previsao),
      l.responsavel?.name ?? l.responsavelNome,
      l.contato,
      l.passo,
      l.retorno ? l.retorno.toISOString().slice(0, 10) : "",
      l.obs,
    ]
      .map(csvCell)
      .join(";");
  });

  return [header.map(csvCell).join(";"), ...lines].join("\n");
}
