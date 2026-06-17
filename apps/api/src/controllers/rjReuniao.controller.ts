import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createReuniaoSchema,
  listReunioesQuerySchema,
  updateReuniaoSchema,
  updateReuniaoStatusSchema,
} from "../schemas/rjReuniao.schema.js";
import {
  createReuniao,
  getReuniaoById,
  getReunioesByCredor,
  listParticipantesOpcoes,
  listReunioes,
  softDeleteReuniao,
  updateReuniao,
  updateReuniaoStatus,
} from "../services/rjReuniao.service.js";
import { buildReuniaoIcs } from "../services/rjIcs.service.js";
import { userHasAnyPermission } from "../services/permission.service.js";
import { unauthorized } from "../utils/httpError.js";

function actorId(request: FastifyRequest): string {
  const sub = request.user?.sub;
  if (!sub) throw unauthorized();
  return sub;
}

export async function getRjReunioes(request: FastifyRequest, reply: FastifyReply) {
  const query = listReunioesQuerySchema.parse(request.query);
  const uid = actorId(request);
  const canViewAll = await userHasAnyPermission(uid, ["rj.agenda.view_all"]);
  const data = await listReunioes(query, uid, canViewAll);
  return reply.send({ data });
}

export async function getRjReuniaoParticipantesOpcoes(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await listParticipantesOpcoes();
  return reply.send({ data });
}

export async function getRjReuniao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getReuniaoById(id);
  return reply.send({ data });
}

export async function postRjReuniao(request: FastifyRequest, reply: FastifyReply) {
  const input = createReuniaoSchema.parse(request.body);
  const data = await createReuniao(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function patchRjReuniao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateReuniaoSchema.parse(request.body);
  const data = await updateReuniao(id, input, actorId(request));
  return reply.send({ data });
}

export async function patchRjReuniaoStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateReuniaoStatusSchema.parse(request.body);
  const data = await updateReuniaoStatus(id, input, actorId(request));
  return reply.send({ data });
}

export async function deleteRjReuniao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await softDeleteReuniao(id, actorId(request));
  return reply.status(204).send();
}

export async function getRjReuniaoIcs(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { filename, content } = await buildReuniaoIcs(id);
  return reply
    .header("Content-Type", "text/calendar; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .send(content);
}

export async function getRjCredorReunioes(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getReunioesByCredor(id);
  return reply.send({ data });
}
