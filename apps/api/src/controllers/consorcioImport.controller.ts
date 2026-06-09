import type { FastifyReply, FastifyRequest } from "fastify";
import { badRequest } from "../utils/httpError.js";
import type { UserImportMappings } from "../services/userResolver.service.js";
import {
  importConsorcioFromBuffer,
  previewConsorcioFromBuffer,
} from "../services/consorcioImport.service.js";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

async function parseUpload(
  request: FastifyRequest,
): Promise<{
  buffer: Buffer;
  sheetName?: string;
  mappings?: UserImportMappings;
  purchaseDate?: Date;
}> {
  let buffer: Buffer | null = null;
  let sheetName: string | undefined;
  let mappings: UserImportMappings | undefined;
  let purchaseDate: Date | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      const lower = part.filename.toLowerCase();
      if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        throw badRequest("Formato inválido. Envie um arquivo .xlsx ou .xls");
      }
      buffer = await part.toBuffer();
    } else if (part.type === "field") {
      if (part.fieldname === "sheetName") {
        const value = String(part.value).trim();
        if (value) sheetName = value;
      } else if (part.fieldname === "mappings") {
        const raw = String(part.value).trim();
        if (raw) {
          try {
            mappings = JSON.parse(raw) as UserImportMappings;
          } catch {
            throw badRequest("Campo 'mappings' deve ser JSON válido");
          }
        }
      } else if (part.fieldname === "purchaseDate") {
        const value = String(part.value).trim();
        if (value) {
          const parsed = new Date(value);
          if (Number.isNaN(parsed.getTime())) {
            throw badRequest("Campo 'purchaseDate' inválido. Use ISO 8601 (YYYY-MM-DD)");
          }
          purchaseDate = parsed;
        }
      }
    }
  }

  if (!buffer) {
    throw badRequest("Envie um arquivo no campo 'file' (multipart/form-data)");
  }

  return { buffer, sheetName, mappings, purchaseDate };
}

export async function previewConsorcioImport(request: FastifyRequest, reply: FastifyReply) {
  const { buffer, sheetName } = await parseUpload(request);
  const preview = await previewConsorcioFromBuffer(buffer, sheetName);
  return reply.send(preview);
}

export async function importConsorcio(request: FastifyRequest, reply: FastifyReply) {
  const { buffer, sheetName, mappings, purchaseDate } = await parseUpload(request);
  if (!purchaseDate) {
    throw badRequest("Informe a data da campanha (campo purchaseDate)");
  }

  const actorUserId = request.user?.sub;
  const report = await importConsorcioFromBuffer(
    buffer,
    { sheetName, mappings, purchaseDate },
    actorUserId,
  );
  return reply.send(report);
}
