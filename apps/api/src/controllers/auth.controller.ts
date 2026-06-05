import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { publicUser, registerUser, validateCredentials } from "../services/auth.service.js";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";

async function issueToken(
  user: { id: string; role: UserRole; name: string; email: string; createdAt: Date },
  reply: FastifyReply,
) {
  const token = await reply.jwtSign({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  return { token, user: publicUser(user) };
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const input = loginSchema.parse(request.body);
  const user = await validateCredentials(input);
  return reply.send(await issueToken(user, reply));
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const input = registerSchema.parse(request.body);
  const user = await registerUser(input);
  const payload = await issueToken(user, reply);
  return reply.status(201).send(payload);
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
  if (!user) throw notFound("Usuário não encontrado");
  return reply.send({ user: publicUser(user) });
}
