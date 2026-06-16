import type { FastifyReply, FastifyRequest } from "fastify";
import { createConfidencialUserSchema } from "../schemas/confidencialUser.schema.js";
import {
  createConfidencialUser,
  deleteConfidencialUser,
  listConfidencialUsers,
} from "../services/confidencialUser.service.js";

export async function getConfidencialUsers(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listConfidencialUsers();
  return reply.send({ data });
}

export async function postConfidencialUser(request: FastifyRequest, reply: FastifyReply) {
  const input = createConfidencialUserSchema.parse(request.body);
  const user = await createConfidencialUser(input);
  return reply.status(201).send({ data: user });
}

export async function removeConfidencialUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteConfidencialUser(id);
  return reply.status(204).send();
}
