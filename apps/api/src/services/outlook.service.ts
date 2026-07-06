import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || "";
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || "";
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || "http://localhost:3000/api/v1/investimentos/outlook/callback";

// Segredo estável para assinar o state do OAuth e cifrar tokens em repouso.
const SECRET = process.env.OUTLOOK_TOKEN_KEY || process.env.JWT_SECRET || "dev-outlook-secret";
const ENC_KEY = crypto.createHash("sha256").update(SECRET).digest(); // 32 bytes p/ AES-256
const STATE_TTL_MS = 10 * 60 * 1000; // state do OAuth vale 10 min

// --- state do OAuth: assinado (HMAC) para evitar account-linking/CSRF -------
function signState(userId: string): string {
  const exp = Date.now() + STATE_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Retorna o userId embutido no state se a assinatura for válida e não tiver expirado. */
export function verifyOutlookState(state: string): string | null {
  const parts = (state ?? "").split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(`${userId}.${expStr}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(Number(expStr)) || Date.now() > Number(expStr)) return null;
  return userId;
}

// --- cifragem dos tokens em repouso (AES-256-GCM) ---------------------------
function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decryptToken(payload: string | null): string | null {
  if (!payload) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null; // valor legado/plaintext → tratar como inválido
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(parts[0], "base64"));
    decipher.setAuthTag(Buffer.from(parts[1], "base64"));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function getOutlookAuthUrl(userId: string) {
  if (!OUTLOOK_CLIENT_ID) {
    throw badRequest("Integração com Outlook não está configurada no servidor (Falta OUTLOOK_CLIENT_ID).");
  }

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    response_type: "code",
    redirect_uri: OUTLOOK_REDIRECT_URI,
    response_mode: "query",
    scope: "offline_access Calendars.ReadWrite User.Read",
    state: signState(userId), // state assinado (não o userId cru) contra account-linking
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function handleOutlookCallback(code: string, state: string) {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    throw badRequest("Configuração do Outlook ausente.");
  }

  // Valida o state assinado e extrai o userId (previne conectar a conta de outro).
  const userId = verifyOutlookState(state);
  if (!userId) {
    throw badRequest("State inválido ou expirado. Reinicie a conexão com o Outlook.");
  }

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    scope: "offline_access Calendars.ReadWrite User.Read",
    code,
    redirect_uri: OUTLOOK_REDIRECT_URI,
    grant_type: "authorization_code",
    client_secret: OUTLOOK_CLIENT_SECRET,
  });

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    // Não logar o corpo (pode conter código/token). Só o erro classificado.
    console.error("Outlook OAuth Error:", data?.error ?? response.status);
    throw badRequest("Falha ao obter token da Microsoft.");
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

  await prisma.user.update({
    where: { id: userId },
    data: {
      outlookAccessToken: encryptToken(data.access_token),
      outlookRefreshToken: encryptToken(data.refresh_token),
      outlookTokenExpiresAt: expiresAt,
    },
  });
}

/**
 * Retorna um Access Token válido. Se estiver expirado, faz refresh.
 */
export async function getValidOutlookToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { outlookAccessToken: true, outlookRefreshToken: true, outlookTokenExpiresAt: true },
  });

  if (!user) return null;
  const refreshToken = decryptToken(user.outlookRefreshToken);
  if (!refreshToken) return null; // não conectado ou token ilegível → reconectar

  // Se tem menos de 5 minutos para expirar, faz refresh
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  if (user.outlookTokenExpiresAt && user.outlookTokenExpiresAt < now) {
    // Fazer refresh
    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      grant_type: "refresh_token",
      scope: "offline_access Calendars.ReadWrite User.Read",
      refresh_token: refreshToken,
      client_secret: OUTLOOK_CLIENT_SECRET,
    });

    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("Falha ao fazer refresh do token do Outlook:", res.status);
      // Desconectar o usuário se o refresh token for revogado
      await prisma.user.update({
        where: { id: userId },
        data: { outlookAccessToken: null, outlookRefreshToken: null, outlookTokenExpiresAt: null },
      });
      return null;
    }

    const data = (await res.json()) as any;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    await prisma.user.update({
      where: { id: userId },
      data: {
        outlookAccessToken: encryptToken(data.access_token),
        outlookRefreshToken: encryptToken(data.refresh_token || refreshToken),
        outlookTokenExpiresAt: expiresAt,
      },
    });

    return data.access_token;
  }

  return decryptToken(user.outlookAccessToken);
}

export interface OutlookEventInput {
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  isOnlineMeeting?: boolean;
}

export async function createOutlookEvent(userId: string, input: OutlookEventInput) {
  const token = await getValidOutlookToken(userId);
  if (!token) return null; // Usuário não conectou o Outlook

  const body: any = {
    subject: input.subject,
    start: {
      dateTime: input.start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: input.end.toISOString(),
      timeZone: "UTC",
    },
  };

  if (input.location) {
    body.location = { displayName: input.location };
  }

  if (input.isOnlineMeeting) {
    body.isOnlineMeeting = true;
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("MS Graph Error ao criar evento:", errorText);
    return null; // ou throw error
  }

  const data = (await res.json()) as any;
  return {
    id: data.id,
    onlineMeetingUrl: data.onlineMeeting?.joinUrl || null,
  };
}

export async function deleteOutlookEvent(userId: string, eventId: string) {
  const token = await getValidOutlookToken(userId);
  if (!token) return;

  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    console.error("Falha ao deletar evento no Outlook", await res.text());
  }
}

export async function getOutlookFreeBusy(userId: string, start: Date, end: Date) {
  const token = await getValidOutlookToken(userId);
  if (!token) return [];

  // Pega os eventos do usuário no range
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.append("startDateTime", start.toISOString());
  url.searchParams.append("endDateTime", end.toISOString());
  url.searchParams.append("$select", "subject,start,end,showAs");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Falha ao ler agenda do Outlook", await res.text());
    return [];
  }

  const data = (await res.json()) as any;
  return (data.value || [])
    .filter((e: any) => e.showAs !== "free") // Ignora eventos marcados como "Livre"
    .map((e: any) => ({
      start: new Date(e.start.dateTime + "Z"), // MS Graph retorna UTC se Prefer header não for passado
      end: new Date(e.end.dateTime + "Z"),
    }));
}
