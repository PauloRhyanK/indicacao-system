import type { FastifyReply, FastifyRequest } from "fastify";
import { badRequest } from "../utils/httpError.js";
import { importLeadsFromBuffer } from "../services/leadImport.service.js";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

export async function importLeads(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file();
  if (!file) throw badRequest("Envie um arquivo no campo 'file' (multipart/form-data)");

  const lower = file.filename.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    throw badRequest("Formato inválido. Envie um arquivo .xlsx ou .xls");
  }

  const buffer = await file.toBuffer();
  const report = await importLeadsFromBuffer(buffer);
  return reply.send(report);
}
