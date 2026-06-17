import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { badRequest } from "../utils/httpError.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const raw = env.RJ_GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw badRequest(
      "Integração Google Calendar não configurada no servidor (RJ_GOOGLE_TOKEN_ENCRYPTION_KEY ausente)",
    );
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw badRequest("RJ_GOOGLE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes (hex 64 chars ou base64)");
  }
  return buf;
}

/** Criptografa refresh_token: iv (12) + authTag (16) + ciphertext, em base64. */
export function encryptGoogleRefreshToken(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptGoogleRefreshToken(encoded: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encoded, "base64");
  if (data.length < IV_LENGTH + 16 + 1) {
    throw badRequest("Token Google armazenado inválido");
  }
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Hash seguro para logs de diagnóstico (nunca logar o token em si). */
export function fingerprintToken(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
