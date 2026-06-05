import type { FastifyReply, FastifyRequest } from "fastify";
import { updateGoalSchema } from "../schemas/goal.schema.js";
import { getCurrentGoal, updateGoal } from "../services/goal.service.js";
import { getDashboardSummary } from "../services/dashboard.service.js";

export async function getCurrent(_request: FastifyRequest, reply: FastifyReply) {
  const goal = await getCurrentGoal();
  return reply.send({ data: goal });
}

export async function patchGoal(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateGoalSchema.parse(request.body);
  const goal = await updateGoal(id, input);
  return reply.send({ data: goal });
}

export async function getSummary(_request: FastifyRequest, reply: FastifyReply) {
  const summary = await getDashboardSummary();
  return reply.send({ data: summary });
}
