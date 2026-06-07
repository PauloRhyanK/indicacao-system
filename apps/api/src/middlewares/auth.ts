import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "../utils/httpError.js";
import { getUserPermissions, userHasAnyPermission } from "../services/permission.service.js";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized("Token ausente ou inválido");
  }
}

export function requirePermission(...keys: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const user = request.user;
    if (!user) throw unauthorized();
    const allowed = await userHasAnyPermission(user.sub, keys);
    if (!allowed) {
      throw forbidden("Você não tem permissão para esta ação");
    }
  };
}

export async function loadPermissions(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user;
  if (!user) throw unauthorized();
  request.permissions = await getUserPermissions(user.sub);
}

declare module "fastify" {
  interface FastifyRequest {
    permissions?: Set<string>;
  }
}
