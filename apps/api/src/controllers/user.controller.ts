import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema, personalDailyTargetSchema } from "../schemas/user.schema.js";
import {
  createUser,
  deleteUser,
  listUsers,
  requirePasswordSetup,
  updatePersonalDailyTarget,
} from "../services/user.service.js";

export async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await listUsers();
  return reply.send({ data: users });
}

export async function postUser(request: FastifyRequest, reply: FastifyReply) {
  const input = createUserSchema.parse(request.body);
  const user = await createUser(input, request.user.sub);
  return reply.status(201).send({ data: user });
}

export async function patchPersonalDailyTarget(request: FastifyRequest, reply: FastifyReply) {
  const input = personalDailyTargetSchema.parse(request.body);
  const row = await updatePersonalDailyTarget(request.user.sub, input.amount);
  return reply.send({
    data: {
      amount: row.personalDailyTarget !== null ? Number(row.personalDailyTarget) : null,
    },
  });
}

export async function patchUserPersonalDailyTarget(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = personalDailyTargetSchema.parse(request.body);
  const row = await updatePersonalDailyTarget(id, input.amount);
  return reply.send({
    data: {
      amount: row.personalDailyTarget !== null ? Number(row.personalDailyTarget) : null,
    },
  });
}

export async function deleteUserHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await deleteUser(id, request.user.sub);
  return reply.send({ data: result });
}

export async function requirePasswordSetupHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await requirePasswordSetup(id, request.user.sub);
  return reply.send({ data: result });
}
