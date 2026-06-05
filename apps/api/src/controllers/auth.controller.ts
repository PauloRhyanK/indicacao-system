import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema } from "../schemas/auth.schema.js";
import { publicUser, validateCredentials } from "../services/auth.service.js";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const input = loginSchema.parse(request.body);
  const user = await validateCredentials(input);

  const token = await reply.jwtSign({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return reply.send({ token, user: publicUser(user) });
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
  if (!user) throw notFound("Usuário não encontrado");
  return reply.send({ user: publicUser(user) });
}
