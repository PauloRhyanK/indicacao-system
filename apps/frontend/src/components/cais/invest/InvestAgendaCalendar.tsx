import { useMemo, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
  type ToolbarProps,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Video } from "lucide-react";
import type { InvestReuniao } from "@/lib/invest-api";
import { INVEST_FAIXA_INFO } from "@/lib/invest-api";
import "react-big-calendar/lib/css/react-big-calendar.css";
// Reuse the existing calendar styles from RJ since they are likely generic enough for layout
import "../rj/rj-agenda-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

const CAL_MIN = new Date(1970, 0, 1, 7, 0, 0);
const CAL_MAX = new Date(1970, 0, 1, 20, 0, 0);
const CAL_DEFAULT_SCROLL = new Date(1970, 0, 1, 7, 0, 0);

const VIEW_LABELS: Record<"month" | "week" | "day", string> = {
  month: "Mês",
  week: "Semana",
  day: "Dia",
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: InvestReuniao;
}

const messages = {
  date: "Data",
  time: "Hora",
  event: "Reunião",
  allDay: "Dia todo",
  week: "Semana",
  work_week: "Semana útil",
  day: "Dia",
  month: "Mês",
  previous: "Anterior",
  next: "Próximo",
  yesterday: "Ontem",
  tomorrow: "Amanhã",
  today: "Hoje",
  agenda: "Lista",
  noEventsInRange: "Nenhuma reunião neste período.",
  showMore: (count: number) => `+${count} mais`,
};

function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

function eventInView(event: CalendarEvent, view: View, anchor: Date): boolean {
  if (view === "day") return isSameDay(event.start, anchor);
  if (view === "week") {
    const weekStart = startOfWeek(anchor, { locale: ptBR });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return event.start >= weekStart && event.start < weekEnd;
  }
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return event.start >= monthStart && event.start <= monthEnd;
}

function computeScrollToTime(events: CalendarEvent[], view: View, anchor: Date): Date {
  if (view === "month") return CAL_DEFAULT_SCROLL;

  const visible = events.filter((e) => eventInView(e, view, anchor));
  if (visible.length === 0) return CAL_DEFAULT_SCROLL;

  const earliest = visible.reduce(
    (min, e) => (e.start < min ? e.start : min),
    visible[0].start,
  );

  const h = earliest.getHours();
  const m = earliest.getMinutes();

  if (h < 7 || h >= 20) {
    return new Date(1970, 0, 1, h, m, 0);
  }

  return CAL_DEFAULT_SCROLL;
}

function InvestCalendarEvent({ event }: EventProps<CalendarEvent>) {
  const reuniao = event.resource;
  const lead = reuniao.lead;
  
  // Use Faixa info to color the event
  const faixa = lead.faixa || "digital";
  const theme = INVEST_FAIXA_INFO[faixa];
  
  const timeLabel = format(event.start, "HH:mm");
  const isOnline = !!reuniao.local && (reuniao.local.includes("http") || reuniao.local.includes("video"));

  return (
    <div
      className="rj-cal-event-inner flex h-full min-h-0 flex-col gap-0.5 overflow-hidden px-1 py-0.5"
      style={{ color: theme.color, backgroundColor: theme.bg }}
    >
      {/* Visão mês: uma linha compacta */}
      <div className="rj-cal-event-month flex min-w-0 items-center gap-1 text-[11px] leading-tight">
        <span className="shrink-0 tabular-nums">{timeLabel}</span>
        <span className="text-slate-400">·</span>
        <span className="min-w-0 truncate font-medium flex-1">
          {lead.nome}
        </span>
        {isOnline && (
          <Video className="h-2.5 w-2.5 shrink-0 opacity-60" style={{ color: theme.color }} aria-hidden />
        )}
      </div>

      {/* Visão semana/dia */}
      <div className="rj-cal-event-time hidden min-w-0 flex-col gap-0.5 text-[11px] leading-snug">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 tabular-nums text-slate-500">
            <span>{formatTimeRange(event.start, event.end)}</span>
          </div>
          {isOnline && (
            <Video className="h-3 w-3 shrink-0 opacity-60" style={{ color: theme.color }} aria-hidden />
          )}
        </div>
        <span className="truncate font-semibold">
          {lead.nome}
        </span>
        {lead.pitch && (
          <span className="line-clamp-2 text-[10px] opacity-80">{lead.pitch}</span>
        )}
      </div>
    </div>
  );
}

function InvestCalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
}: ToolbarProps<CalendarEvent>) {
  return (
    <div className="rj-cal-toolbar mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <ToolbarBtn onClick={() => onNavigate("TODAY")}>Hoje</ToolbarBtn>
        <ToolbarBtn onClick={() => onNavigate("PREV")} aria-label="Anterior">
          ‹
        </ToolbarBtn>
        <ToolbarBtn onClick={() => onNavigate("NEXT")} aria-label="Próximo">
          ›
        </ToolbarBtn>
      </div>

      <span className="text-[14px] font-semibold text-azul-profundo capitalize">{label}</span>

      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        {(["month", "week", "day"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
              view === v
                ? "bg-azul-profundo text-branco"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  ...rest
}: {
  children: ReactNode;
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-azul-profundo"
      {...rest}
    >
      {children}
    </button>
  );
}

export function InvestAgendaCalendar({
  reunioes,
  view,
  date,
  onView,
  onNavigate,
  onSelectEvent,
}: {
  reunioes: InvestReuniao[];
  view: View;
  date: Date;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectEvent: (reuniao: InvestReuniao) => void;
}) {
  const events = useMemo<CalendarEvent[]>(
    () =>
      reunioes.map((r) => {
        const start = new Date(r.data_hora_inicio);
        const end = r.data_hora_fim ? new Date(r.data_hora_fim) : new Date(start.getTime() + 3600000);
        return {
          id: r.id,
          title: r.lead.nome,
          start,
          end,
          resource: r,
        };
      }),
    [reunioes],
  );

  const scrollToTime = useMemo(() => computeScrollToTime(events, view, date), [events, view, date]);

  return (
    <div className="rj-cal-wrapper h-[700px] w-full rounded-md border border-slate-200 bg-branco p-4 shadow-sm">
      <Calendar
        localizer={localizer}
        events={events}
        date={date}
        view={view}
        onView={onView}
        onNavigate={onNavigate}
        messages={messages}
        min={CAL_MIN}
        max={CAL_MAX}
        scrollToTime={scrollToTime}
        dayLayoutAlgorithm="no-overlap"
        formats={{
          timeGutterFormat: "HH:mm",
          eventTimeRangeFormat: ({ start, end }) => formatTimeRange(start, end),
          agendaTimeRangeFormat: ({ start, end }) => formatTimeRange(start, end),
          dayHeaderFormat: "EEEE, dd 'de' MMMM",
          dayRangeHeaderFormat: ({ start, end }) =>
            `${format(start, "dd 'de' MMM")} – ${format(end, "dd 'de' MMM")}`,
        }}
        components={{
          event: InvestCalendarEvent,
          toolbar: InvestCalendarToolbar,
        }}
        onSelectEvent={(e) => onSelectEvent(e.resource)}
        popup
        selectable={false}
      />
    </div>
  );
}
