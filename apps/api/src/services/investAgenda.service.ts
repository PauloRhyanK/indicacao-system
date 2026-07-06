import { prisma } from "../config/prisma.js";
import { INVEST_FAIXA_LABELS, type InvestFaixa } from "../constants/invest.js";
import { badRequest, conflict, notFound } from "../utils/httpError.js";
import { activeUserWhere } from "../utils/softDelete.js";
import { getOutlookFreeBusy, createOutlookEvent } from "./outlook.service.js";
import type {
  CreateInvestReuniaoInput,
  SetAssessorFaixasInput,
} from "../schemas/invest.schema.js";

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1h quando não há fim informado

/**
 * Assessores compatíveis com uma faixa. Regra: um assessor atende a faixa se
 * tem competência cadastrada para ela; assessor SEM nenhuma competência
 * cadastrada é tratado como "atende todas" (não trava antes de configurar).
 */
export async function listAssessoresParaFaixa(faixa: InvestFaixa | null) {
  const [users, competencias] = await Promise.all([
    prisma.user.findMany({ where: activeUserWhere, select: { id: true, name: true } }),
    prisma.investAssessorFaixa.findMany(),
  ]);

  const byUser = new Map<string, Set<string>>();
  for (const c of competencias) {
    const set = byUser.get(c.userId) ?? new Set<string>();
    set.add(c.faixa);
    byUser.set(c.userId, set);
  }

  return users.filter((u) => {
    if (!faixa) return true;
    const comp = byUser.get(u.id);
    return comp && comp.has(faixa);
  });
}

export async function getAssessorFaixasMap() {
  const rows = await prisma.investAssessorFaixa.findMany();
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.userId] ??= []).push(r.faixa);
  }
  return map;
}

export async function setAssessorFaixas(userId: string, input: SetAssessorFaixasInput) {
  const user = await prisma.user.findFirst({ where: { id: userId, ...activeUserWhere } });
  if (!user) throw notFound("Assessor não encontrado");
  await prisma.$transaction([
    prisma.investAssessorFaixa.deleteMany({ where: { userId } }),
    prisma.investAssessorFaixa.createMany({
      data: input.faixas.map((faixa) => ({ userId, faixa })),
      skipDuplicates: true,
    }),
  ]);
  return { userId, faixas: input.faixas };
}

function serializeReuniao(r: {
  id: string;
  dataHoraInicio: Date;
  dataHoraFim: Date | null;
  titulo: string;
  local: string;
  status: string;
  faixa: string | null;
  lead: { id: string; nome: string; faixa: string | null; pitch: string };
  assessor: { id: string; name: string };
}) {
  return {
    id: r.id,
    data_hora_inicio: r.dataHoraInicio.toISOString(),
    data_hora_fim: r.dataHoraFim ? r.dataHoraFim.toISOString() : null,
    titulo: r.titulo,
    local: r.local,
    status: r.status,
    faixa: r.faixa,
    lead: r.lead,
    assessor: r.assessor,
  };
}

const reuniaoInclude = {
  lead: { select: { id: true, nome: true, faixa: true, pitch: true } },
  assessor: { select: { id: true, name: true } },
} as const;

export async function createReuniao(input: CreateInvestReuniaoInput, actorUserId?: string) {
  const lead = await prisma.investLead.findFirst({
    where: { id: input.leadId, deletedAt: null },
    select: { id: true, faixa: true, nome: true },
  });
  if (!lead) throw notFound("Lead não encontrado");

  // Trava de faixa: o assessor precisa ser compatível com a faixa do lead.
  const compativeis = await listAssessoresParaFaixa(lead.faixa as InvestFaixa | null);
  if (!compativeis.some((a) => a.id === input.assessorId)) {
    const faixaLabel = lead.faixa ? INVEST_FAIXA_LABELS[lead.faixa as InvestFaixa] : "—";
    throw badRequest(`Assessor não atende a faixa ${faixaLabel} deste lead`);
  }

  const inicio = new Date(input.dataHoraInicio);
  if (Number.isNaN(inicio.getTime())) throw badRequest("Data/hora inválida");
  const fim = input.dataHoraFim ? new Date(input.dataHoraFim) : new Date(inicio.getTime() + DEFAULT_DURATION_MS);

  // Anti double-booking: sem sobreposição para o mesmo assessor.
  const conflito = await prisma.investReuniao.findFirst({
    where: {
      assessorId: input.assessorId,
      deletedAt: null,
      status: { not: "cancelada" },
      dataHoraInicio: { lt: fim },
      OR: [
        { dataHoraFim: { gt: inicio } },
        { dataHoraFim: null, dataHoraInicio: { gt: new Date(inicio.getTime() - DEFAULT_DURATION_MS) } },
      ],
    },
  });
  if (conflito) throw conflict("Assessor já tem reunião nesse horário");

  let finalLocal = input.local;
  let outlookEventId: string | null = null;

  try {
    const outlookRes = await createOutlookEvent(input.assessorId, {
      subject: input.titulo || `Reunião de Investimentos: ${lead.nome}`,
      start: inicio,
      end: fim,
      location: input.local,
      isOnlineMeeting: input.isOnline,
    });

    if (outlookRes) {
      outlookEventId = outlookRes.id;
      if (outlookRes.onlineMeetingUrl) {
        // Se pediu online e retornou link, prioriza o link do Teams no local se vazio
        finalLocal = finalLocal ? `${finalLocal} - ${outlookRes.onlineMeetingUrl}` : outlookRes.onlineMeetingUrl;
      }
    }
  } catch (err) {
    console.error("Falha ao criar evento no Outlook (Silenciada):", err);
  }

  const created = await prisma.investReuniao.create({
    data: {
      leadId: input.leadId,
      assessorId: input.assessorId,
      dataHoraInicio: inicio,
      dataHoraFim: input.dataHoraFim ? fim : null,
      titulo: input.titulo,
      local: finalLocal,
      faixa: lead.faixa,
      criadoPorId: actorUserId ?? null,
      outlookEventId,
    },
    include: reuniaoInclude,
  });

  // Ao marcar reunião, o lead avança para "Reunião agendada" (se ainda antes disso).
  await prisma.investLead.update({
    where: { id: input.leadId },
    data: { etapa: "reuniao" },
  });

  return serializeReuniao(created);
}

export async function listReunioes(params: {
  assessorId?: string;
  leadId?: string;
}) {
  const reunioes = await prisma.investReuniao.findMany({
    where: {
      deletedAt: null,
      ...(params.assessorId ? { assessorId: params.assessorId } : {}),
      ...(params.leadId ? { leadId: params.leadId } : {}),
    },
    include: reuniaoInclude,
    orderBy: { dataHoraInicio: "asc" },
  });
  return reunioes.map(serializeReuniao);
}

export async function getAssessorSlots(assessorId: string, date: string) {
  // date format: YYYY-MM-DD
  const startOfDay = new Date(`${date}T00:00:00.000-03:00`);
  const endOfDay = new Date(`${date}T23:59:59.999-03:00`);

  const [reunioes, outlookEvents] = await Promise.all([
    prisma.investReuniao.findMany({
      where: {
        assessorId,
        deletedAt: null,
        status: { not: "cancelada" },
        dataHoraInicio: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
    getOutlookFreeBusy(assessorId, startOfDay, endOfDay).catch(() => [])
  ]);

  const slots = [];
  // Horário comercial: 09:00 às 18:00
  for (let hour = 9; hour <= 18; hour++) {
    const slotStart = new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00.000-03:00`);
    const slotEnd = new Date(slotStart.getTime() + DEFAULT_DURATION_MS);

    // Checar sobreposição no CAIS
    const hasCaisOverlap = reunioes.some((r: any) => {
      const rStart = r.dataHoraInicio;
      const rEnd = r.dataHoraFim ? r.dataHoraFim : new Date(rStart.getTime() + DEFAULT_DURATION_MS);
      return slotStart < rEnd && slotEnd > rStart;
    });

    // Checar sobreposição no Outlook
    const hasOutlookOverlap = outlookEvents.some((e: any) => {
      return slotStart < e.end && slotEnd > e.start;
    });

    if (!hasCaisOverlap && !hasOutlookOverlap) {
      slots.push(slotStart.toISOString());
    }
  }

  return slots;
}

export async function cancelReuniao(id: string) {
  const existing = await prisma.investReuniao.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound("Reunião não encontrada");
  await prisma.investReuniao.update({ where: { id }, data: { status: "cancelada", deletedAt: new Date() } });
}
