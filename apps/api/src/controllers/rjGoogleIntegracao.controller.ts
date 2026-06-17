import type { FastifyReply, FastifyRequest } from "fastify";
import {
  buildGoogleAuthUrl,
  disconnectGoogleIntegracao,
  getGoogleIntegracaoStatus,
  googleOAuthErrorRedirect,
  handleGoogleOAuthCallback,
} from "../services/rjGoogleIntegracao.service.js";
import { unauthorized } from "../utils/httpError.js";

function actorId(request: FastifyRequest): string {
  const sub = request.user?.sub;
  if (!sub) throw unauthorized();
  return sub;
}

export async function getGoogleAuthUrl(request: FastifyRequest, reply: FastifyReply) {
  const url = buildGoogleAuthUrl(actorId(request));
  return reply.send({ data: { url } });
}

export async function getGoogleOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code, state, error } = request.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    return reply.redirect(googleOAuthErrorRedirect(`Google recusou a autorização: ${error}`));
  }

  if (!code || !state) {
    return reply.redirect(googleOAuthErrorRedirect("Resposta OAuth incompleta do Google"));
  }

  try {
    const redirectUrl = await handleGoogleOAuthCallback(code, state);
    return reply.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao conectar Google Calendar";
    return reply.redirect(googleOAuthErrorRedirect(message));
  }
}

export async function getGoogleIntegracaoStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = await getGoogleIntegracaoStatus(actorId(request));
  return reply.send({ data });
}

export async function deleteGoogleIntegracao(request: FastifyRequest, reply: FastifyReply) {
  await disconnectGoogleIntegracao(actorId(request));
  return reply.status(204).send();
}
