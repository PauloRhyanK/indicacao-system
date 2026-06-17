import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { prisma } from "../config/prisma.js";
import { getReuniaoRow } from "./rjReuniao.service.js";
import {
  ensureGoogleCalendarExists,
  getAuthenticatedGoogleClient,
  isGoogleInvalidGrantError,
  markGoogleIntegracaoError,
  markGoogleIntegracaoRevoked,
  touchGoogleIntegracaoSync,
} from "./rjGoogleIntegracao.service.js";

const TIMEZONE = "America/Sao_Paulo";
const MAX_RETRIES = 2;

type GoogleOAuth2Client = NonNullable<
  Awaited<ReturnType<typeof getAuthenticatedGoogleClient>>
>["client"];

function googleCalendarApi(auth: GoogleOAuth2Client) {
  return google.calendar({ version: "v3", auth: auth as never });
}

type ReuniaoRow = Awaited<ReturnType<typeof getReuniaoRow>>;

function scheduleGoogleSync(fn: () => Promise<void>) {
  setImmediate(() => {
    fn().catch((err) => {
      console.error("[rj-google-sync]", err);
    });
  });
}

function toGoogleDateTime(date: Date): string {
  return date.toISOString();
}

function buildEventBody(reuniao: ReuniaoRow): calendar_v3.Schema$Event {
  const inicio = reuniao.dataHoraInicio;
  const fim = reuniao.dataHoraFim ?? new Date(inicio.getTime() + 60 * 60 * 1000);

  const descriptionParts = [
    reuniao.pauta,
    reuniao.linkOnline ? `Link: ${reuniao.linkOnline}` : null,
    `Credor: ${reuniao.credor.nome}`,
  ].filter(Boolean);

  return {
    summary: reuniao.titulo,
    description: descriptionParts.join("\n"),
    location: reuniao.local ?? undefined,
    start: { dateTime: toGoogleDateTime(inicio), timeZone: TIMEZONE },
    end: { dateTime: toGoogleDateTime(fim), timeZone: TIMEZONE },
  };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isGoogleInvalidGrantError(err)) throw err;
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: number }).code
          : undefined;
      if (code && code >= 400 && code < 500 && code !== 429) throw err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function handleGoogleApiError(userId: string, err: unknown) {
  if (isGoogleInvalidGrantError(err)) {
    await markGoogleIntegracaoRevoked(userId);
    return;
  }
  const message = err instanceof Error ? err.message : "Erro desconhecido na API do Google";
  await markGoogleIntegracaoError(userId, message);
}

async function syncInsertForUser(reuniao: ReuniaoRow, userId: string) {
  const auth = await getAuthenticatedGoogleClient(userId);
  if (!auth) return;

  const { client } = auth;
  let calendarId = await ensureGoogleCalendarExists(client, userId, auth.calendarId);
  const calendar = googleCalendarApi(client);

  const existing = await prisma.rjReuniaoGoogleEvento.findUnique({
    where: { reuniaoId_userId: { reuniaoId: reuniao.id, userId } },
  });
  if (existing && existing.status === "sincronizado") return;

  const body = buildEventBody(reuniao);
  if (reuniao.status === "cancelada") {
    body.status = "cancelled";
  }

  await withRetry(async () => {
    if (existing?.googleEventId) {
      await calendar.events.patch({
        calendarId,
        eventId: existing.googleEventId,
        requestBody: body,
      });
      await prisma.rjReuniaoGoogleEvento.update({
        where: { id: existing.id },
        data: { status: "sincronizado", googleEventId: existing.googleEventId },
      });
    } else {
      const { data } = await calendar.events.insert({
        calendarId,
        requestBody: body,
      });
      if (!data.id) throw new Error("Google não retornou ID do evento");
      await prisma.rjReuniaoGoogleEvento.upsert({
        where: { reuniaoId_userId: { reuniaoId: reuniao.id, userId } },
        create: {
          reuniaoId: reuniao.id,
          userId,
          googleEventId: data.id,
          status: "sincronizado",
        },
        update: {
          googleEventId: data.id,
          status: "sincronizado",
        },
      });
    }
    await touchGoogleIntegracaoSync(userId);
  }).catch(async (err) => {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 404
    ) {
      calendarId = await ensureGoogleCalendarExists(client, userId, calendarId);
      return syncInsertForUser(reuniao, userId);
    }
    await handleGoogleApiError(userId, err);
    await prisma.rjReuniaoGoogleEvento.upsert({
      where: { reuniaoId_userId: { reuniaoId: reuniao.id, userId } },
      create: {
        reuniaoId: reuniao.id,
        userId,
        googleEventId: existing?.googleEventId ?? "erro",
        status: "erro",
      },
      update: { status: "erro" },
    });
  });
}

async function syncPatchForUser(reuniao: ReuniaoRow, userId: string) {
  const mapping = await prisma.rjReuniaoGoogleEvento.findUnique({
    where: { reuniaoId_userId: { reuniaoId: reuniao.id, userId } },
  });
  if (!mapping || mapping.status === "removido") {
    return syncInsertForUser(reuniao, userId);
  }

  const auth = await getAuthenticatedGoogleClient(userId);
  if (!auth) return;

  const { client } = auth;
  const calendarId = await ensureGoogleCalendarExists(client, userId, auth.calendarId);
  const calendar = googleCalendarApi(client);
  const body = buildEventBody(reuniao);
  if (reuniao.status === "cancelada") {
    body.status = "cancelled";
  }

  await withRetry(async () => {
    await calendar.events.patch({
      calendarId,
      eventId: mapping.googleEventId,
      requestBody: body,
    });
    await prisma.rjReuniaoGoogleEvento.update({
      where: { id: mapping.id },
      data: { status: "sincronizado" },
    });
    await touchGoogleIntegracaoSync(userId);
  }).catch(async (err) => {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 404
    ) {
      await prisma.rjReuniaoGoogleEvento.delete({ where: { id: mapping.id } });
      return syncInsertForUser(reuniao, userId);
    }
    await handleGoogleApiError(userId, err);
  });
}

async function syncCancelForUser(reuniao: ReuniaoRow, userId: string) {
  const mapping = await prisma.rjReuniaoGoogleEvento.findUnique({
    where: { reuniaoId_userId: { reuniaoId: reuniao.id, userId } },
  });
  if (!mapping || mapping.status === "removido") return;

  const auth = await getAuthenticatedGoogleClient(userId);
  if (!auth) return;

  const { client } = auth;
  const calendarId = await ensureGoogleCalendarExists(client, userId, auth.calendarId);
  const calendar = googleCalendarApi(client);

  await withRetry(async () => {
    await calendar.events.patch({
      calendarId,
      eventId: mapping.googleEventId,
      requestBody: { status: "cancelled" },
    });
    await touchGoogleIntegracaoSync(userId);
  }).catch(async (err) => {
    await handleGoogleApiError(userId, err);
  });
}

async function syncDeleteForUser(reuniaoId: string, userId: string) {
  const mapping = await prisma.rjReuniaoGoogleEvento.findUnique({
    where: { reuniaoId_userId: { reuniaoId, userId } },
  });
  if (!mapping) return;

  const auth = await getAuthenticatedGoogleClient(userId);
  if (!auth) {
    await prisma.rjReuniaoGoogleEvento.delete({ where: { id: mapping.id } });
    return;
  }

  const { client } = auth;
  const calendarId = await ensureGoogleCalendarExists(client, userId, auth.calendarId);
  const calendar = googleCalendarApi(client);

  await withRetry(async () => {
    try {
      await calendar.events.delete({
        calendarId,
        eventId: mapping.googleEventId,
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: number }).code
          : undefined;
      if (code !== 404) throw err;
    }
    await prisma.rjReuniaoGoogleEvento.delete({ where: { id: mapping.id } });
    await touchGoogleIntegracaoSync(userId);
  }).catch(async (err) => {
    await handleGoogleApiError(userId, err);
    await prisma.rjReuniaoGoogleEvento.update({
      where: { id: mapping.id },
      data: { status: "removido" },
    });
  });
}

async function getIntegracaoUserIds(participanteIds: string[]): Promise<string[]> {
  if (participanteIds.length === 0) return [];
  const rows = await prisma.rjGoogleIntegracao.findMany({
    where: {
      userId: { in: participanteIds },
      OR: [{ ultimoErro: null }, { ultimoErro: { not: { startsWith: "token_revogado" } } }],
    },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export function scheduleGoogleSyncOnCreate(reuniaoId: string) {
  scheduleGoogleSync(async () => {
    const reuniao = await getReuniaoRow(reuniaoId);
    const userIds = await getIntegracaoUserIds(reuniao.participantes.map((p) => p.userId));
    await Promise.all(userIds.map((userId) => syncInsertForUser(reuniao, userId)));
  });
}

export function scheduleGoogleSyncOnUpdate(
  reuniaoId: string,
  previousParticipantIds: string[],
) {
  scheduleGoogleSync(async () => {
    const reuniao = await getReuniaoRow(reuniaoId);
    const currentIds = reuniao.participantes.map((p) => p.userId);
    const removed = previousParticipantIds.filter((id) => !currentIds.includes(id));
    const added = currentIds.filter((id) => !previousParticipantIds.includes(id));
    const unchanged = currentIds.filter((id) => previousParticipantIds.includes(id));

    const integratedAdded = await getIntegracaoUserIds(added);
    const integratedUnchanged = await getIntegracaoUserIds(unchanged);

    await Promise.all([
      ...integratedAdded.map((userId) => syncInsertForUser(reuniao, userId)),
      ...integratedUnchanged.map((userId) => syncPatchForUser(reuniao, userId)),
      ...removed.map((userId) => syncDeleteForUser(reuniaoId, userId)),
    ]);
  });
}

export function scheduleGoogleSyncOnCancel(reuniaoId: string) {
  scheduleGoogleSync(async () => {
    const reuniao = await getReuniaoRow(reuniaoId);
    const userIds = await getIntegracaoUserIds(reuniao.participantes.map((p) => p.userId));
    await Promise.all(userIds.map((userId) => syncCancelForUser(reuniao, userId)));
  });
}

export function scheduleGoogleSyncOnDelete(reuniaoId: string, participantIds: string[]) {
  scheduleGoogleSync(async () => {
    const integrated = await getIntegracaoUserIds(participantIds);
    await Promise.all(integrated.map((userId) => syncDeleteForUser(reuniaoId, userId)));
  });
}
