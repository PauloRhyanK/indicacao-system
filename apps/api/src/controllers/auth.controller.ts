import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { publicUser, registerUser, validateCredentials } from "../services/auth.service.js";
import { getUserPermissions, getUserRoles } from "../services/permission.service.js";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";

async function issueToken(
  user: { id: string; name: string; email: string; createdAt: Date },
  reply: FastifyReply,
) {
  const [permissions, roles] = await Promise.all([
    getUserPermissions(user.id),
    getUserRoles(user.id),
  ]);
  const token = await reply.jwtSign({
    sub: user.id,
    name: user.name,
    email: user.email,
  });
  return {
    token,
    user: publicUser(user, roles),
    permissions: Array.from(permissions),
  };
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
  const user = await prisma.user.findFirst({
    where: { id: request.user.sub, deletedAt: null },
  });
  if (!user) throw notFound("Usuário não encontrado");
  const [permissions, roles] = await Promise.all([
    getUserPermissions(user.id),
    getUserRoles(user.id),
  ]);
  return reply.send({
    user: publicUser(user, roles),
    permissions: Array.from(permissions),
  });
}
