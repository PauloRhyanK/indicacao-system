import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInvestPitchSchema,
  listInvestPitchesQuerySchema,
  updateInvestPitchSchema,
} from "../schemas/invest-pitch.schema.js";
import {
  createInvestPitch,
  getInvestPitch,
  listInvestPitches,
  softDeleteInvestPitch,
  updateInvestPitch,
} from "../services/invest-pitch.service.js";

function actorId(request: FastifyRequest) {
  return request.user?.sub;
}

export async function getInvestPitches(request: FastifyRequest, reply: FastifyReply) {
  const query = listInvestPitchesQuerySchema.parse(request.query);
  const data = await listInvestPitches(query);
  return reply.send({ data });
}

export async function getInvestPitchById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getInvestPitch(id);
  return reply.send({ data });
}

export async function postInvestPitch(request: FastifyRequest, reply: FastifyReply) {
  const input = createInvestPitchSchema.parse(request.body);
  const data = await createInvestPitch(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function patchInvestPitch(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateInvestPitchSchema.parse(request.body);
  const data = await updateInvestPitch(id, input);
  return reply.send({ data });
}

export async function deleteInvestPitch(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await softDeleteInvestPitch(id);
  return reply.status(204).send();
}
