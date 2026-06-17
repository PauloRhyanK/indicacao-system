import type { RjReuniao } from "@/lib/cais-api";

function eventBounds(reuniao: RjReuniao): { start: Date; end: Date } {
  const start = new Date(reuniao.dataHoraInicio);
  const end = reuniao.dataHoraFim
    ? new Date(reuniao.dataHoraFim)
    : new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

function eventDescription(reuniao: RjReuniao): string {
  const parts = [
    reuniao.pauta,
    reuniao.linkOnline ? `Link: ${reuniao.linkOnline}` : null,
    `Credor: ${reuniao.credor.nome}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function formatGoogleUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Abre o Google Calendar com o evento pré-preenchido (sem download). */
export function googleCalendarAddUrl(reuniao: RjReuniao): string {
  const { start, end } = eventBounds(reuniao);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: reuniao.titulo,
    dates: `${formatGoogleUtc(start)}/${formatGoogleUtc(end)}`,
    details: eventDescription(reuniao),
    location: reuniao.local || reuniao.linkOnline || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Abre o Outlook na web com o evento pré-preenchido. */
export function outlookCalendarAddUrl(reuniao: RjReuniao): string {
  const { start, end } = eventBounds(reuniao);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: reuniao.titulo,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: eventDescription(reuniao),
    location: reuniao.local || "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function openCalendarUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
