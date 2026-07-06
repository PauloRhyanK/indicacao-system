import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInvestLeadSchema,
  createInvestReuniaoSchema,
  importInvestLeadsSchema,
  listReunioesQuerySchema,
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
} from "../services/investAgenda.service.js";
import type { InvestFaixa } from "../constants/invest.js";
import {
  createInvestLead,
  exportInvestLeadsCsv,
  getInvestConfig,
  importInvestLeads,
  listInvestLeads,
  softDeleteInvestLead,
  updateInvestConfig,
  updateInvestEtapa,
  updateInvestLead,
} from "../services/invest.service.js";

function actorId(request: FastifyRequest) {
  return request.user?.sub;
}

export async function getInvestLeads(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listInvestLeads();
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

export async function getInvestConfigHandler(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getInvestConfig();
  return reply.send({ data });
}

export async function putInvestConfig(request: FastifyRequest, reply: FastifyReply) {
  const input = updateInvestConfigSchema.parse(request.body);
  const data = await updateInvestConfig(input);
  return reply.send({ data });
}

export async function postInvestImport(request: FastifyRequest, reply: FastifyReply) {
  const input = importInvestLeadsSchema.parse(request.body);
  const data = await importInvestLeads(input.rows, actorId(request));
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
