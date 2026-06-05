import type { FastifyReply, FastifyRequest } from "fastify";
import { badRequest } from "../utils/httpError.js";
import {
  importLeadsFromBuffer,
  previewWorkbookFromBuffer,
} from "../services/leadImport.service.js";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

async function parseUpload(request: FastifyRequest): Promise<{ buffer: Buffer; sheetName?: string }> {
  let buffer: Buffer | null = null;
  let sheetName: string | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      const lower = part.filename.toLowerCase();
      if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        throw badRequest("Formato inválido. Envie um arquivo .xlsx ou .xls");
      }
      buffer = await part.toBuffer();
    } else if (part.type === "field" && part.fieldname === "sheetName") {
      const value = String(part.value).trim();
      if (value) sheetName = value;
    }
  }

  if (!buffer) {
    throw badRequest("Envie um arquivo no campo 'file' (multipart/form-data)");
  }

  return { buffer, sheetName };
}

export async function previewImport(request: FastifyRequest, reply: FastifyReply) {
  const { buffer } = await parseUpload(request);
  const preview = previewWorkbookFromBuffer(buffer);
  return reply.send(preview);
}

export async function importLeads(request: FastifyRequest, reply: FastifyReply) {
  const { buffer, sheetName } = await parseUpload(request);
  const report = await importLeadsFromBuffer(buffer, { sheetName });
  return reply.send(report);
}
