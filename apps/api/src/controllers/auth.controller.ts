import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserAccessScope } from "@prisma/client";
import { loginSchema, registerSchema, setInitialPasswordSchema } from "../schemas/auth.schema.js";
import {
  publicUser,
  registerUser,
  setInitialPassword,
  validateCredentials,
} from "../services/auth.service.js";
import { getUserPermissions, getUserRoles } from "../services/permission.service.js";
import { prisma } from "../config/prisma.js";
import { notFound, unauthorized } from "../utils/httpError.js";
import {
  ACCESS_DENIED_NO_RJ,
  ACCESS_DENIED_WRONG_REALM,
  canAccessRealm,
  resolveAccessScope,
  type AuthRealm,
} from "../constants/accessScope.js";

async function issueToken(
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    mustChangePassword?: boolean;
    accessScope: UserAccessScope;
  },
  reply: FastifyReply,
) {
  const [permissions, roles] = await Promise.all([
    getUserPermissions(user.id),
    getUserRoles(user.id),
  ]);
  const effectiveScope = resolveAccessScope(user.accessScope, roles);
  const token = await reply.jwtSign({
    sub: user.id,
    name: user.name,
    email: user.email,
  });
  return {
    token,
    user: publicUser({ ...user, accessScope: effectiveScope }, roles),
    permissions: Array.from(permissions),
  };
}

function assertRealmAccess(
  user: { accessScope: UserAccessScope },
  roles: { name: string }[],
  permissions: Set<string>,
  realm: AuthRealm,
) {
  const effectiveScope = resolveAccessScope(user.accessScope, roles);
  if (!canAccessRealm(effectiveScope, realm, permissions)) {
    if (realm === "admin") {
      throw unauthorized("Esta conta é exclusiva do ambiente confidencial.", {
        code: ACCESS_DENIED_WRONG_REALM,
      });
    }
    if (effectiveScope === "INTERNAL") {
      throw unauthorized("Esta conta não tem acesso ao ambiente confidencial.", {
        code: ACCESS_DENIED_WRONG_REALM,
      });
    }
    throw unauthorized("Sem permissão para acessar o ambiente confidencial.", {
      code: ACCESS_DENIED_NO_RJ,
    });
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const input = loginSchema.parse(request.body);
  const user = await validateCredentials(input);
  const [permissions, roles] = await Promise.all([
    getUserPermissions(user.id),
    getUserRoles(user.id),
  ]);
  assertRealmAccess(user, roles, permissions, input.realm);
  return reply.send(await issueToken(user, reply));
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const input = registerSchema.parse(request.body);
  const user = await registerUser(input);
  const payload = await issueToken(user, reply);
  return reply.status(201).send(payload);
}

export async function setInitialPasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = setInitialPasswordSchema.parse(request.body);
  const user = await setInitialPassword(input);
  return reply.send(await issueToken(user, reply));
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
    user: publicUser(
      { ...user, accessScope: resolveAccessScope(user.accessScope, roles) },
      roles,
    ),
    permissions: Array.from(permissions),
  });
}
