import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../config/prisma.js";
import { ACCESS_PENDING_APPROVAL, isConfidencialUserApproved } from "../constants/accessScope.js";
import { forbidden, unauthorized } from "../utils/httpError.js";
import { getUserPermissions, userHasAnyPermission } from "../services/permission.service.js";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized("Token ausente ou inválido");
  }
}

export async function requireConfidencialApproved(request: FastifyRequest, _reply: FastifyReply) {
  const userId = request.user?.sub;
  if (!userId) throw unauthorized();

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { accessScope: true, confidencialApprovedAt: true },
  });
  if (!user) throw unauthorized("Usuário não encontrado");
  if (!isConfidencialUserApproved(user)) {
    throw forbidden("Conta aguardando aprovação do administrador RJ.", {
      code: ACCESS_PENDING_APPROVAL,
    });
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
