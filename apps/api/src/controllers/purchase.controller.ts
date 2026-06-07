import type { FastifyReply, FastifyRequest } from "fastify";
import { createPurchaseSchema } from "../schemas/purchase.schema.js";
import { listAllPurchases, listPurchases, registerPurchase } from "../services/purchase.service.js";

export async function postPurchase(request: FastifyRequest, reply: FastifyReply) {
  const { leadId } = request.params as { leadId: string };
  const input = createPurchaseSchema.parse(request.body);
  const result = await registerPurchase(leadId, input);
  return reply.status(201).send({ data: result });
}

export async function getPurchases(request: FastifyRequest, reply: FastifyReply) {
  const { leadId } = request.params as { leadId: string };
  const purchases = await listPurchases(leadId);
  return reply.send({ data: purchases });
}

export async function getAllPurchases(_request: FastifyRequest, reply: FastifyReply) {
  const purchases = await listAllPurchases();
  return reply.send({ data: purchases });
}
