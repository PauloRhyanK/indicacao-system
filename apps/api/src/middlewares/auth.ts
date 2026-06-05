import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { forbidden, unauthorized } from "../utils/httpError.js";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized("Token ausente ou inválido");
  }
}

export function authorize(...roles: UserRole[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const user = request.user;
    if (!user) throw unauthorized();
    if (roles.length > 0 && !roles.includes(user.role)) {
      throw forbidden("Você não tem permissão para esta ação");
    }
  };
}
