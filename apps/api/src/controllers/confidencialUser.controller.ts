import type { FastifyReply, FastifyRequest } from "fastify";
import { createConfidencialUserSchema } from "../schemas/confidencialUser.schema.js";
import {
  approveConfidencialUser,
  createConfidencialUser,
  deleteConfidencialUser,
  listConfidencialUsers,
  resetConfidencialUserPassword,
} from "../services/confidencialUser.service.js";

export async function getConfidencialUsers(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listConfidencialUsers();
  return reply.send({ data });
}

export async function postConfidencialUser(request: FastifyRequest, reply: FastifyReply) {
  const input = createConfidencialUserSchema.parse(request.body);
  const user = await createConfidencialUser(input, request.user.sub);
  return reply.status(201).send({ data: user });
}

export async function removeConfidencialUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteConfidencialUser(id, request.user.sub);
  return reply.status(204).send();
}

export async function approveConfidencialUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = await approveConfidencialUser(id, request.user.sub);
  return reply.send({ data: user });
}

export async function resetConfidencialUserPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const result = await resetConfidencialUserPassword(id, request.user.sub);
  return reply.send({ data: result });
}
