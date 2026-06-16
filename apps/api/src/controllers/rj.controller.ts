import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createCredorSchema,
  listRjHistoricoQuerySchema,
  updateConfigSchema,
  updateCredorSchema,
  updateCredorStatusSchema,
} from "../schemas/rj.schema.js";
import {
  createCredor,
  exportCredoresCsv,
  listCredores,
  softDeleteCredor,
  updateCredor,
  updateCredorStatus,
} from "../services/rjCredor.service.js";
import { getConfig, updateConfig } from "../services/rjConfig.service.js";
import { listCredorAuditLogs, listRjAuditLogs } from "../services/rjAudit.service.js";

function actorId(request: FastifyRequest) {
  return request.user?.sub;
}

export async function getRjCredores(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listCredores();
  return reply.send({ data });
}

export async function getRjCredoresCsv(_request: FastifyRequest, reply: FastifyReply) {
  const csv = await exportCredoresCsv();
  return reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", 'attachment; filename="condominio_credores_mg2.csv"')
    .send(`\ufeff${csv}`);
}

export async function postRjCredor(request: FastifyRequest, reply: FastifyReply) {
  const input = createCredorSchema.parse(request.body);
  const data = await createCredor(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function patchRjCredor(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateCredorSchema.parse(request.body);
  const data = await updateCredor(id, input, actorId(request));
  return reply.send({ data });
}

export async function patchRjCredorStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateCredorStatusSchema.parse(request.body);
  const data = await updateCredorStatus(id, input, actorId(request));
  return reply.send({ data });
}

export async function deleteRjCredor(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await softDeleteCredor(id, actorId(request));
  return reply.status(204).send();
}

export async function getRjConfig(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getConfig();
  return reply.send({ data });
}

export async function putRjConfig(request: FastifyRequest, reply: FastifyReply) {
  const input = updateConfigSchema.parse(request.body);
  const data = await updateConfig(input.passivo, actorId(request));
  return reply.send({ data });
}

export async function getRjHistorico(request: FastifyRequest, reply: FastifyReply) {
  const query = listRjHistoricoQuerySchema.parse(request.query);
  const data = await listRjAuditLogs(query);
  return reply.send({ data });
}

export async function getRjCredorHistorico(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const query = listRjHistoricoQuerySchema.parse(request.query);
  const data = await listCredorAuditLogs(id, query);
  return reply.send({ data });
}
