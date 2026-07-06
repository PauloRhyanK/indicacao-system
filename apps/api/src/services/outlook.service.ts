import { prisma } from "../config/prisma.js";
import { badRequest } from "../utils/httpError.js";

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || "";
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || "";
const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || "http://localhost:3000/api/v1/investimentos/outlook/callback";

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
    state: userId, // pass the userId so we know who is connecting
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function handleOutlookCallback(code: string, userId: string) {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    throw badRequest("Configuração do Outlook ausente.");
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
    console.error("Outlook OAuth Error:", data);
    throw badRequest("Falha ao obter token da Microsoft.");
  }

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

  await prisma.user.update({
    where: { id: userId },
    data: {
      outlookAccessToken: data.access_token,
      outlookRefreshToken: data.refresh_token,
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

  if (!user || !user.outlookRefreshToken) return null;

  // Se tem menos de 5 minutos para expirar, faz refresh
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  if (user.outlookTokenExpiresAt && user.outlookTokenExpiresAt < now) {
    // Fazer refresh
    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      grant_type: "refresh_token",
      scope: "offline_access Calendars.ReadWrite User.Read",
      refresh_token: user.outlookRefreshToken,
      client_secret: OUTLOOK_CLIENT_SECRET,
    });

    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("Falha ao fazer refresh do token do Outlook");
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
        outlookAccessToken: data.access_token,
        outlookRefreshToken: data.refresh_token || user.outlookRefreshToken,
        outlookTokenExpiresAt: expiresAt,
      },
    });

    return data.access_token;
  }

  return user.outlookAccessToken;
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
  url.searchParams.append("$select", "subject,start,end");

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
  return (data.value || []).map((e: any) => ({
    start: new Date(e.start.dateTime + "Z"), // MS Graph retorna UTC se Prefer header não for passado
    end: new Date(e.end.dateTime + "Z"),
  }));
}
