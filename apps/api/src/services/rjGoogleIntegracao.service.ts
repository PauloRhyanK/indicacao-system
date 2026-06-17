import { google } from "googleapis";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";
import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
} from "../utils/rjGoogleCrypto.js";
import {
  createGoogleOAuthState,
  verifyGoogleOAuthState,
} from "../utils/rjGoogleOAuthState.js";

export const RJ_GOOGLE_CALENDAR_NAME = "CAIS · RJ";
export const RJ_GOOGLE_CALENDAR_DESCRIPTION =
  "Reuniões do condomínio de credores — sincronizado automaticamente pelo CAIS Indicações";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
export const GOOGLE_TOKEN_REVOKED = "token_revogado";

type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

function googleCalendarApi(auth: GoogleOAuth2Client) {
  return google.calendar({ version: "v3", auth: auth as never });
}

function googleOauth2Api(auth: GoogleOAuth2Client) {
  return google.oauth2({ version: "v2", auth: auth as never });
}

function assertGoogleOAuthConfigured() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw badRequest(
      "Integração Google Calendar não configurada no servidor (credenciais OAuth ausentes)",
    );
  }
}

export function createOAuth2Client(): GoogleOAuth2Client {
  assertGoogleOAuthConfigured();
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

export function buildGoogleAuthUrl(userId: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: createGoogleOAuthState(userId),
  });
}

function confidencialPerfilUrl(query?: string): string {
  const base = env.CONFIDENCIAL_APP_URL ?? "http://localhost:5174";
  const path = "/configuracoes/perfil";
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

async function fetchGoogleEmail(client: GoogleOAuth2Client): Promise<string> {
  const oauth2 = googleOauth2Api(client);
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw badRequest("Não foi possível obter o e-mail da conta Google");
  return data.email;
}

export async function createSecondaryCalendar(client: GoogleOAuth2Client): Promise<string> {
  const calendar = googleCalendarApi(client);
  const { data } = await calendar.calendars.insert({
    requestBody: {
      summary: RJ_GOOGLE_CALENDAR_NAME,
      description: RJ_GOOGLE_CALENDAR_DESCRIPTION,
      timeZone: "America/Sao_Paulo",
    },
  });
  if (!data.id) throw badRequest("Google não retornou o ID do calendário");

  try {
    await calendar.calendarList.patch({
      calendarId: data.id,
      requestBody: { colorId: "9" },
    });
  } catch {
    // cor opcional — não bloqueia a conexão
  }

  return data.id;
}

export async function handleGoogleOAuthCallback(code: string, state: string): Promise<string> {
  const userId = verifyGoogleOAuthState(state);
  const client = createOAuth2Client();

  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw badRequest(
      "Google não retornou refresh_token. Revogue o acesso em myaccount.google.com e tente novamente.",
    );
  }

  client.setCredentials(tokens);
  const googleEmail = await fetchGoogleEmail(client);
  const calendarId = await createSecondaryCalendar(client);
  const refreshTokenEnc = encryptGoogleRefreshToken(tokens.refresh_token);

  await prisma.rjGoogleIntegracao.upsert({
    where: { userId },
    create: {
      userId,
      googleEmail,
      refreshTokenEnc,
      calendarId,
      ultimoErro: null,
    },
    update: {
      googleEmail,
      refreshTokenEnc,
      calendarId,
      conectadoEm: new Date(),
      ultimoSyncEm: null,
      ultimoErro: null,
    },
  });

  return confidencialPerfilUrl("google=conectado");
}

export async function getGoogleIntegracaoStatus(userId: string) {
  const row = await prisma.rjGoogleIntegracao.findUnique({ where: { userId } });
  if (!row) {
    return {
      conectado: false,
      expirado: false,
      googleEmail: null as string | null,
      calendarName: RJ_GOOGLE_CALENDAR_NAME,
      conectadoEm: null as string | null,
      ultimoSyncEm: null as string | null,
      ultimoErro: null as string | null,
    };
  }

  const expirado = row.ultimoErro?.startsWith(GOOGLE_TOKEN_REVOKED) ?? false;

  return {
    conectado: !expirado,
    expirado,
    googleEmail: row.googleEmail,
    calendarName: RJ_GOOGLE_CALENDAR_NAME,
    conectadoEm: row.conectadoEm.toISOString(),
    ultimoSyncEm: row.ultimoSyncEm?.toISOString() ?? null,
    ultimoErro: row.ultimoErro,
  };
}

export async function getAuthenticatedGoogleClient(userId: string): Promise<{
  client: GoogleOAuth2Client;
  calendarId: string;
  integracaoId: string;
} | null> {
  const integracao = await prisma.rjGoogleIntegracao.findUnique({ where: { userId } });
  if (!integracao || integracao.ultimoErro?.startsWith(GOOGLE_TOKEN_REVOKED)) {
    return null;
  }

  const client = createOAuth2Client();
  const refreshToken = decryptGoogleRefreshToken(integracao.refreshTokenEnc);
  client.setCredentials({ refresh_token: refreshToken });

  return { client, calendarId: integracao.calendarId, integracaoId: integracao.id };
}

export async function markGoogleIntegracaoError(userId: string, message: string) {
  await prisma.rjGoogleIntegracao.updateMany({
    where: { userId },
    data: { ultimoErro: message.slice(0, 500) },
  });
}

export async function markGoogleIntegracaoRevoked(userId: string) {
  await prisma.rjGoogleIntegracao.updateMany({
    where: { userId },
    data: { ultimoErro: `${GOOGLE_TOKEN_REVOKED}: acesso revogado no Google` },
  });
}

export async function touchGoogleIntegracaoSync(userId: string) {
  await prisma.rjGoogleIntegracao.updateMany({
    where: { userId },
    data: { ultimoSyncEm: new Date(), ultimoErro: null },
  });
}

export async function disconnectGoogleIntegracao(userId: string) {
  const integracao = await prisma.rjGoogleIntegracao.findUnique({ where: { userId } });
  if (!integracao) return;

  const clientResult = await getAuthenticatedGoogleClient(userId);
  if (clientResult) {
    const { client, calendarId } = clientResult;
    const calendar = googleCalendarApi(client);

    try {
      await calendar.calendars.delete({ calendarId });
    } catch {
      // calendário pode já ter sido apagado manualmente
    }

    try {
      const refreshToken = decryptGoogleRefreshToken(integracao.refreshTokenEnc);
      await client.revokeToken(refreshToken);
    } catch {
      // token pode já estar revogado
    }
  }

  await prisma.$transaction([
    prisma.rjReuniaoGoogleEvento.deleteMany({ where: { userId } }),
    prisma.rjGoogleIntegracao.delete({ where: { userId } }),
  ]);
}

export function googleOAuthErrorRedirect(message: string): string {
  return confidencialPerfilUrl(`google=erro&msg=${encodeURIComponent(message)}`);
}

export function isGoogleInvalidGrantError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number; message?: string; response?: { data?: { error?: string } } };
  if (e.response?.data?.error === "invalid_grant") return true;
  if (typeof e.message === "string" && e.message.includes("invalid_grant")) return true;
  return false;
}

export async function ensureGoogleCalendarExists(
  client: GoogleOAuth2Client,
  userId: string,
  currentCalendarId: string,
): Promise<string> {
  const calendar = googleCalendarApi(client);
  try {
    await calendar.calendars.get({ calendarId: currentCalendarId });
    return currentCalendarId;
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "code" in err ? (err as { code?: number }).code : undefined;
    if (status !== 404) throw err;
  }

  const newCalendarId = await createSecondaryCalendar(client);
  await prisma.rjGoogleIntegracao.update({
    where: { userId },
    data: { calendarId: newCalendarId },
  });
  return newCalendarId;
}
