import { getReuniaoRow } from "./rjReuniao.service.js";

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

export async function buildReuniaoIcs(id: string): Promise<{ filename: string; content: string }> {
  const reuniao = await getReuniaoRow(id);

  const inicio = reuniao.dataHoraInicio;
  const fim = reuniao.dataHoraFim ?? new Date(inicio.getTime() + 60 * 60 * 1000);

  const description = [reuniao.pauta, reuniao.linkOnline ? `Link: ${reuniao.linkOnline}` : null]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CAIS Indicacoes//Agenda RJ//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reuniao.id}@cais-indicacoes`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(inicio)}`,
    `DTEND:${formatIcsDate(fim)}`,
    `SUMMARY:${escapeIcsText(reuniao.titulo)}`,
    reuniao.local ? `LOCATION:${escapeIcsText(reuniao.local)}` : null,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    reuniao.linkOnline ? `URL:${escapeIcsText(reuniao.linkOnline)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  const content = lines.map(foldLine).join("\r\n");
  return { filename: `reuniao-${reuniao.id}.ics`, content };
}
