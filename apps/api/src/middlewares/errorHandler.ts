import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "validation",
      message: "Dados inválidos",
      details: error.flatten(),
    });
  }

  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return reply.status(409).send({
        error: "conflict",
        message: "Registro já existe (valor único duplicado)",
        details: error.meta,
      });
    }
    if (error.code === "P2025") {
      return reply.status(404).send({
        error: "not_found",
        message: "Recurso não encontrado",
      });
    }
  }

  // Erros de validação de schema do Fastify (ex.: body inválido).
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    return reply.status(fastifyError.statusCode).send({
      error: "request_error",
      message: error.message,
    });
  }

  request.log.error(error);
  return reply.status(500).send({
    error: "internal_error",
    message: "Erro interno do servidor",
  });
}
