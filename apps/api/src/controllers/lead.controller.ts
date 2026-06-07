import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createLeadSchema,
  listLeadsQuerySchema,
  treeQuerySchema,
  updateLeadSchema,
} from "../schemas/lead.schema.js";
import {
  createLead,
  deleteLead,
  getLeadById,
  listLeads,
  updateLead,
} from "../services/lead.service.js";
import { getBonusChain } from "../services/bonusChain.service.js";
import { getReferralTree } from "../services/referralTree.service.js";

export async function getLeads(request: FastifyRequest, reply: FastifyReply) {
  const query = listLeadsQuerySchema.parse(request.query);
  const result = await listLeads(query);
  return reply.send(result);
}

export async function getLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const lead = await getLeadById(id);
  return reply.send({ data: lead });
}

export async function postLead(request: FastifyRequest, reply: FastifyReply) {
  const input = createLeadSchema.parse(request.body);
  const lead = await createLead(input);
  return reply.status(201).send({ data: lead });
}

export async function patchLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateLeadSchema.parse(request.body);
  const lead = await updateLead(id, input);
  return reply.send({ data: lead });
}

export async function removeLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await deleteLead(id);
  return reply.status(204).send();
}

export async function getLeadTree(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { maxDepth } = treeQuerySchema.parse(request.query);
  const tree = await getReferralTree(id, maxDepth);
  return reply.send(tree);
}

export async function getLeadBonusChain(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { maxDepth } = treeQuerySchema.parse(request.query);
  const result = await getBonusChain(id, maxDepth);
  return reply.send({ data: result });
}
