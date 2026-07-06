import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInvestLeadSchema,
  createInvestReuniaoSchema,
  investGridQuerySchema,
  importInvestLeadsSchema,
  listReunioesQuerySchema,
  qualifyInvestLeadSchema,
  setAssessorFaixasSchema,
  updateInvestConfigSchema,
  updateInvestEtapaSchema,
  updateInvestLeadSchema,
} from "../schemas/invest.schema.js";
import {
  cancelReuniao,
  createReuniao,
  getAssessorFaixasMap,
  listAssessoresParaFaixa,
  listReunioes,
  setAssessorFaixas,
  getAssessorSlots,
} from "../services/investAgenda.service.js";
import type { InvestFaixa } from "../constants/invest.js";
import {
  createInvestLead,
  exportInvestLeadsCsv,
  getInvestConfig,
  getInvestTvData,
  importInvestLeads,
  listInvestLeads,
  listInvestLeadsGrid,
  qualifyLead,
  softDeleteInvestLead,
  updateInvestConfig,
  updateInvestEtapa,
  updateInvestLead,
} from "../services/invest.service.js";
import { getOutlookAuthUrl, handleOutlookCallback } from "../services/outlook.service.js";

function actorId(request: FastifyRequest) {
  return request.user?.sub;
}

export async function getInvestLeads(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listInvestLeads();
  return reply.send({ data });
}

export async function getInvestLeadsGrid(request: FastifyRequest, reply: FastifyReply) {
  const query = investGridQuerySchema.parse(request.query);
  const data = await listInvestLeadsGrid(query, actorId(request));
  return reply.send({ data });
}

export async function postInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const input = createInvestLeadSchema.parse(request.body);
  const data = await createInvestLead(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function patchInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateInvestLeadSchema.parse(request.body);
  const data = await updateInvestLead(id, input);
  return reply.send({ data });
}

export async function patchInvestLeadEtapa(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateInvestEtapaSchema.parse(request.body);
  const data = await updateInvestEtapa(id, input);
  return reply.send({ data });
}

export async function deleteInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await softDeleteInvestLead(id);
  return reply.status(204).send();
}

export async function postInvestQualify(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = qualifyInvestLeadSchema.parse(request.body);
  const data = await qualifyLead(id, input.faixa, actorId(request));
  return reply.send({ data });
}

export async function getInvestConfigHandler(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getInvestConfig();
  return reply.send({ data });
}

export async function getInvestTv(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getInvestTvData();
  return reply.send({ data });
}

export async function putInvestConfig(request: FastifyRequest, reply: FastifyReply) {
  const input = updateInvestConfigSchema.parse(request.body);
  const data = await updateInvestConfig(input);
  return reply.send({ data });
}

export async function postInvestImport(request: FastifyRequest, reply: FastifyReply) {
  const input = importInvestLeadsSchema.parse(request.body);
  const data = await importInvestLeads(input.rows, input.aliases, actorId(request));
  return reply.send({ data });
}

export async function getInvestLeadsCsv(_request: FastifyRequest, reply: FastifyReply) {
  const csv = await exportInvestLeadsCsv();
  return reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", 'attachment; filename="pipeline_investimentos.csv"')
    .send(`\ufeff${csv}`);
}

// --- Agenda de reuni\u00f5es (KUS-153/149) --------------------------------------

export async function getInvestAssessores(request: FastifyRequest, reply: FastifyReply) {
  const { faixa } = request.query as { faixa?: string };
  const data = await listAssessoresParaFaixa((faixa ?? null) as InvestFaixa | null);
  return reply.send({ data });
}

export async function getInvestAssessorSlotsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { date } = request.query as { date: string }; // YYYY-MM-DD
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reply.status(400).send({ message: "Data inválida ou ausente (use YYYY-MM-DD)." });
  }
  const data = await getAssessorSlots(id, date);
  return reply.send({ data });
}

export async function postInvestReuniao(request: FastifyRequest, reply: FastifyReply) {
  const input = createInvestReuniaoSchema.parse(request.body);
  const data = await createReuniao(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function getInvestReunioes(request: FastifyRequest, reply: FastifyReply) {
  const query = listReunioesQuerySchema.parse(request.query);
  const assessorId = query.scope === "mine" ? actorId(request) : query.assessorId;
  const data = await listReunioes({ assessorId, leadId: query.leadId });
  return reply.send({ data });
}

export async function deleteInvestReuniao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await cancelReuniao(id);
  return reply.status(204).send();
}

export async function getInvestAssessorFaixas(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getAssessorFaixasMap();
  return reply.send({ data });
}

export async function putInvestAssessorFaixas(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = setAssessorFaixasSchema.parse(request.body);
  const data = await setAssessorFaixas(id, input);
  return reply.send({ data });
}

export async function getInvestOutlookAuth(request: FastifyRequest, reply: FastifyReply) {
  const url = getOutlookAuthUrl(actorId(request));
  return reply.send({ url });
}

export async function getInvestOutlookCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code, state } = request.query as { code: string; state: string };
  if (!code || !state) {
    return reply.status(400).send({ error: "Faltando code ou state." });
  }

  // state is the userId
  await handleOutlookCallback(code, state);

  // Redireciona de volta para a página de reuniões
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return reply.redirect(`${frontendUrl}/investimentos/reunioes?outlook=connected`);
}
