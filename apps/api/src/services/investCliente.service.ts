import { Prisma, type InvestCliente } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  INVEST_ETAPA_DEFAULT_PROB,
  INVEST_FAIXA_VALUES,
  INVEST_FAIXA_LABELS,
  faixaFromPl,
  type InvestFaixa,
} from "../constants/invest.js";
import { notFound } from "../utils/httpError.js";
import { normalizeText } from "../utils/slugify.js";
import type {
  ConvertInvestClienteInput,
  InvestBtgImportRow,
  InvestClientesQuery,
} from "../schemas/investCliente.schema.js";
import { serializeInvestLead } from "./invest.service.js";

const includeLead = {
  lead: {
    select: { id: true, nome: true, etapa: true },
  },
} as const;

type InvestClienteWithLead = InvestCliente & {
  lead: { id: string; nome: string; etapa: string } | null;
};

function parseNumberBr(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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

function parseRetorno(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function effectivePl(plTotal: number, plDeclarado: number): number {
  return plTotal > 0 ? plTotal : plDeclarado;
}

function serializeInvestCliente(cliente: InvestClienteWithLead) {
  const plTotal = Number(cliente.plTotal);
  const plDeclarado = Number(cliente.plDeclarado);
  return {
    id: cliente.id,
    conta: cliente.conta,
    btg_cliente_id: cliente.btgClienteId,
    nome: cliente.nome,
    email: cliente.email,
    assessor_nome: cliente.assessorNome,
    assessor_email: cliente.assessorEmail,
    pl_total: plTotal,
    pl_declarado: plDeclarado,
    pl_efetivo: effectivePl(plTotal, plDeclarado),
    faixa_btg: cliente.faixaBtg,
    faixa: cliente.faixa,
    cidade: cliente.cidade,
    estado: cliente.estado,
    profissao: cliente.profissao,
    tipo_investidor: cliente.tipoInvestidor,
    dados_extras: cliente.dadosExtras,
    convertido: Boolean(cliente.lead),
    lead_id: cliente.lead?.id ?? null,
    lead_etapa: cliente.lead?.etapa ?? null,
    imported_at: cliente.importedAt.toISOString(),
    created_at: cliente.createdAt.toISOString(),
    updated_at: cliente.updatedAt.toISOString(),
  };
}

export type SerializedInvestCliente = ReturnType<typeof serializeInvestCliente>;

export async function listInvestClientes(query: InvestClientesQuery) {
  const and: Prisma.InvestClienteWhereInput[] = [];

  if (query.q?.trim()) {
    const q = query.q.trim();
    and.push({
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { conta: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { assessorNome: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (query.assessor) and.push({ assessorNome: query.assessor });
  if (query.faixa) and.push({ faixa: query.faixa });
  if (query.status === "novo") and.push({ lead: { is: null } });
  if (query.status === "convertido") and.push({ lead: { isNot: null } });

  const where: Prisma.InvestClienteWhereInput = and.length > 0 ? { AND: and } : {};

  const [total, rows] = await Promise.all([
    prisma.investCliente.count({ where }),
    prisma.investCliente.findMany({
      where,
      include: includeLead,
      orderBy: [{ plTotal: "desc" }, { nome: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    clientes: rows.map(serializeInvestCliente),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getInvestClienteById(id: string) {
  const cliente = await prisma.investCliente.findUnique({
    where: { id },
    include: includeLead,
  });
  if (!cliente) throw notFound("Cliente não encontrado");
  return serializeInvestCliente(cliente);
}

export interface InvestClienteImportReport {
  total: number;
  created: number;
  updated: number;
}

export async function importInvestClientes(
  rows: InvestBtgImportRow[],
  actorUserId?: string,
): Promise<InvestClienteImportReport> {
  void actorUserId;

  const existing = await prisma.investCliente.findMany({
    select: { id: true, conta: true, btgClienteId: true },
  });
  const byConta = new Map(existing.map((c) => [c.conta, c.id]));
  const byBtgId = new Map(
    existing.filter((c) => c.btgClienteId).map((c) => [c.btgClienteId!, c.id]),
  );

  const report: InvestClienteImportReport = { total: rows.length, created: 0, updated: 0 };
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const conta = row.conta.trim();
      const plTotal = parseNumberBr(row.plTotal);
      const plDeclarado = parseNumberBr(row.plDeclarado);
      const pl = effectivePl(plTotal, plDeclarado);
      const btgId = (row.btgClienteId ?? "").trim() || null;

      const data = {
        nome: row.nome.trim(),
        btgClienteId: btgId,
        email: (row.email ?? "").trim(),
        assessorNome: (row.assessorNome ?? "").trim(),
        assessorEmail: (row.assessorEmail ?? "").trim(),
        plTotal: new Prisma.Decimal(plTotal),
        plDeclarado: new Prisma.Decimal(plDeclarado),
        faixaBtg: (row.faixaBtg ?? "").trim(),
        faixa: faixaFromPl(pl),
        cidade: (row.cidade ?? "").trim(),
        estado: (row.estado ?? "").trim(),
        profissao: (row.profissao ?? "").trim(),
        tipoInvestidor: (row.tipoInvestidor ?? "").trim(),
        dadosExtras: (row.dadosExtras ?? {}) as Prisma.InputJsonValue,
        importedAt: now,
      };

      const existingId = byConta.get(conta) ?? (btgId ? byBtgId.get(btgId) : undefined);
      if (existingId) {
        await tx.investCliente.update({ where: { id: existingId }, data });
        report.updated += 1;
      } else {
        const created = await tx.investCliente.create({ data: { conta, ...data } });
        byConta.set(conta, created.id);
        if (btgId) byBtgId.set(btgId, created.id);
        report.created += 1;
      }
    }
  });

  return report;
}

async function resolveUserByAlias(name: string): Promise<string | null> {
  if (!name.trim()) return null;
  const key = normalizeText(name);
  const [aliases, users] = await Promise.all([
    prisma.userAlias.findMany({
      include: { user: { select: { id: true, deletedAt: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  for (const a of aliases) {
    if (!a.user.deletedAt && a.aliasNormalized === key) return a.user.id;
  }
  for (const u of users) {
    if (normalizeText(u.name) === key) return u.id;
  }
  return null;
}

const includeResponsavel = {
  responsavel: { select: { id: true, name: true } },
  vendedor: { select: { id: true, name: true } },
  coVendedor: { select: { id: true, name: true } },
  qualificadoPor: { select: { id: true, name: true } },
  sdrRelatoPor: { select: { id: true, name: true } },
  pitchRef: { select: { id: true, titulo: true, faixa: true } },
} as const;

export async function convertInvestClienteToLead(
  clienteId: string,
  input: ConvertInvestClienteInput,
  actorUserId?: string,
) {
  const cliente = await prisma.investCliente.findUnique({
    where: { id: clienteId },
    include: includeLead,
  });
  if (!cliente) throw notFound("Cliente não encontrado");

  if (cliente.lead) {
    const existing = await prisma.investLead.findFirst({
      where: { id: cliente.lead.id, deletedAt: null },
      include: includeResponsavel,
    });
    if (existing) {
      return {
        lead: serializeInvestLead(existing),
        alreadyConverted: true,
        message: "Este cliente já foi convertido em lead.",
      };
    }
  }

  let responsavelId = input.responsavelId ?? null;
  let responsavelNome = input.responsavelNome ?? "";
  if (!responsavelId && cliente.assessorNome) {
    const mapped = await resolveUserByAlias(cliente.assessorNome);
    if (mapped) {
      responsavelId = mapped;
      responsavelNome = "";
    } else if (!responsavelNome) {
      responsavelNome = cliente.assessorNome;
    }
  }

  const faixa = normalizeFaixa(input.faixa) ?? faixaFromPl(input.pl);
  const etapa = "qualificado";

  const created = await prisma.investLead.create({
    data: {
      nome: input.nome,
      origem: input.origem,
      produto: input.produto,
      pitch: input.pitch,
      pitchId: input.pitchId ?? null,
      pl: new Prisma.Decimal(input.pl),
      etapa,
      probabilidade: INVEST_ETAPA_DEFAULT_PROB[etapa],
      faixa,
      responsavelId,
      responsavelNome: responsavelId ? "" : responsavelNome,
      celular: input.celular,
      contato: input.contato,
      passo: input.passo,
      retorno: parseRetorno(input.retorno),
      obs: input.obs,
      investClienteId: cliente.id,
      qualificadoPorId: actorUserId ?? null,
      qualificadoEm: new Date(),
      createdById: actorUserId ?? null,
    },
    include: includeResponsavel,
  });

  return {
    lead: serializeInvestLead(created),
    alreadyConverted: false,
    message: "Lead criado e enviado para a Fila SDR.",
  };
}

export async function listInvestClienteAssessores() {
  const rows = await prisma.investCliente.findMany({
    where: { assessorNome: { not: "" } },
    select: { assessorNome: true },
    distinct: ["assessorNome"],
    orderBy: { assessorNome: "asc" },
  });
  return rows.map((r) => r.assessorNome);
}
