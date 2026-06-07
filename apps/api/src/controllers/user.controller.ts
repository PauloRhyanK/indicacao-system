import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserSchema } from "../schemas/user.schema.js";
import { createUser, listUsers } from "../services/user.service.js";
import { updatePersonalDailyTarget } from "../services/user.service.js";
import { personalDailyTargetSchema } from "../schemas/user.schema.js";

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
