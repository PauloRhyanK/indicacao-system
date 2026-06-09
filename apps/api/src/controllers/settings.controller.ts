import type { FastifyReply, FastifyRequest } from "fastify";
import { createLookupSchema, updateLookupSchema } from "../schemas/settings.schema.js";
import {
  createLookup,
  deleteLookup,
  getAllLookups,
  updateLookup,
  type LookupKind,
} from "../services/lookup.service.js";

function parseKindFromUrl(url: string): LookupKind {
  if (url.includes("lead-statuses")) return "status";
  throw new Error("Tipo inválido");
}

export async function getLookups(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getAllLookups();
  return reply.send({ data });
}

export async function postLookupItem(request: FastifyRequest, reply: FastifyReply) {
  const kind = parseKindFromUrl(request.url);
  const body = createLookupSchema.parse(request.body);
  const data = await createLookup(kind, body);
  return reply.status(201).send({ data });
}

export async function patchLookup(request: FastifyRequest, reply: FastifyReply) {
  const kind = parseKindFromUrl(request.url);
  const { id } = request.params as { id: string };
  const body = updateLookupSchema.parse(request.body);
  const data = await updateLookup(kind, id, body);
  return reply.send({ data });
}

export async function removeLookup(request: FastifyRequest, reply: FastifyReply) {
  const kind = parseKindFromUrl(request.url);
  const { id } = request.params as { id: string };
  await deleteLookup(kind, id);
  return reply.status(204).send();
}
