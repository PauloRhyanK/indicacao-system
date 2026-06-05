import type { FastifyReply, FastifyRequest } from "fastify";
import { listAllReferrals } from "../services/referralList.service.js";

export async function getReferrals(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listAllReferrals();
  return reply.send({ data });
}
