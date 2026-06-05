import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { createUserSchema } from "../schemas/user.schema.js";
import { createUser, listUsers } from "../services/user.service.js";

export async function getUsers(request: FastifyRequest, reply: FastifyReply) {
  const { role } = request.query as { role?: UserRole };
  const users = await listUsers(role);
  return reply.send({ data: users });
}

export async function postUser(request: FastifyRequest, reply: FastifyReply) {
  const input = createUserSchema.parse(request.body);
  const user = await createUser(input);
  return reply.status(201).send({ data: user });
}
