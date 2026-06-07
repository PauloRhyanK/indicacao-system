import type { FastifyReply, FastifyRequest } from "fastify";
import { createLookupSchema, updateLookupSchema } from "../schemas/settings.schema.js";
import {
  createConsortiumType,
  deleteConsortiumType,
  listConsortiumTypes,
  updateConsortiumType,
} from "../services/consortiumType.service.js";

export async function getConsortiumTypes(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listConsortiumTypes();
  return reply.send({ data });
}

export async function postConsortiumType(request: FastifyRequest, reply: FastifyReply) {
  const body = createLookupSchema.parse(request.body);
  const data = await createConsortiumType(body);
  return reply.status(201).send({ data });
}

export async function patchConsortiumType(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateLookupSchema.parse(request.body);
  const data = await updateConsortiumType(id, body);
  return reply.send({ data });
}

export async function removeConsortiumType(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteConsortiumType(id);
  return reply.status(204).send();
}
