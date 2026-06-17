import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { badRequest, unauthorized } from "../utils/httpError.js";

const STATE_TTL_MS = 10 * 60 * 1000;

function signPayload(payloadB64: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(payloadB64).digest("base64url");
}

export function createGoogleOAuthState(userId: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomNonce(),
  });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyGoogleOAuthState(state: string): string {
  const parts = state.split(".");
  if (parts.length !== 2) throw unauthorized("State OAuth inválido");

  const [payloadB64, signature] = parts;
  const expected = signPayload(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw unauthorized("State OAuth inválido");
  }

  let parsed: { userId?: string; exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw unauthorized("State OAuth inválido");
  }

  if (!parsed.userId || typeof parsed.exp !== "number") {
    throw badRequest("State OAuth malformado");
  }
  if (Date.now() > parsed.exp) {
    throw unauthorized("State OAuth expirado — tente conectar novamente");
  }

  return parsed.userId;
}

function randomNonce(): string {
  return createHmac("sha256", env.JWT_SECRET).update(String(Math.random())).digest("hex").slice(0, 16);
}
