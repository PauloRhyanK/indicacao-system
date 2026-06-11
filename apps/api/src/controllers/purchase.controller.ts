import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createPurchaseSchema,
  deletePurchaseSchema,
  updatePurchaseSchema,
} from "../schemas/purchase.schema.js";
import {
  deletePurchase,
  listAllPurchases,
  listPurchases,
  registerPurchase,
  updatePurchase,
} from "../services/purchase.service.js";

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

export async function patchPurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updatePurchaseSchema.parse(request.body);
  const purchase = await updatePurchase(id, input);
  return reply.send({ data: purchase });
}

export async function removePurchase(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = deletePurchaseSchema.parse(request.body ?? {});
  await deletePurchase(id, input);
  return reply.status(204).send();
}
