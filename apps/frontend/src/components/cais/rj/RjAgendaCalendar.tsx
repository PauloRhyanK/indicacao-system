import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RjReuniao } from "@/lib/cais-api";
import { RJ_REUNIAO_STATUS_CALENDAR_COLOR } from "@/lib/rj-constants";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: RjReuniao;
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

export function RjAgendaCalendar({
  reunioes,
  view,
  date,
  onView,
  onNavigate,
  onSelectEvent,
}: {
  reunioes: RjReuniao[];
  view: View;
  date: Date;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectEvent: (reuniao: RjReuniao) => void;
}) {
  const events = useMemo<CalendarEvent[]>(
    () =>
      reunioes.map((r) => {
        const start = new Date(r.dataHoraInicio);
        const end = r.dataHoraFim ? new Date(r.dataHoraFim) : new Date(start.getTime() + 3600000);
        return {
          id: r.id,
          title: `${r.credor.nome} — ${r.titulo}`,
          start,
          end,
          resource: r,
        };
      }),
    [reunioes],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3" style={{ height: 640 }}>
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={["month", "week", "day"]}
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        messages={messages}
        popup
        onSelectEvent={(event) => onSelectEvent((event as CalendarEvent).resource)}
        eventPropGetter={(event) => {
          const status = (event as CalendarEvent).resource.status;
          return {
            style: {
              backgroundColor: RJ_REUNIAO_STATUS_CALENDAR_COLOR[status],
              borderColor: RJ_REUNIAO_STATUS_CALENDAR_COLOR[status],
              color: "#fff",
              fontSize: "12px",
            },
          };
        }}
      />
    </div>
  );
}
