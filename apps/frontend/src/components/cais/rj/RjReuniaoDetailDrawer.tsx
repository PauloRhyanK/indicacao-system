import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ExternalLink, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/cais/Button";
import { SlideOver, inputClass } from "@/components/cais/SlideOver";
import { addRjReuniaoToDeviceCalendar, type RjReuniao, type RjReuniaoStatus } from "@/lib/cais-api";
import { fetchRjGoogleIntegracaoStatus } from "@/lib/cais-api-google";
import {
  googleCalendarAddUrl,
  openCalendarUrl,
  outlookCalendarAddUrl,
} from "@/lib/rj-calendar-links";
import {
  RJ_REUNIAO_STATUS_LABELS,
  RJ_REUNIAO_STATUS_PILL_CLASS,
} from "@/lib/rj-constants";
import { formatRjDateTime } from "@/lib/rj-format";
import { humanizeErrorMessage } from "@/lib/humanize-error";

export function RjReuniaoDetailDrawer({
  open,
  reuniao,
  canManage,
  onClose,
  onEdit,
  onChangeStatus,
  onDelete,
  statusPending,
  deletePending,
}: {
  open: boolean;
  reuniao: RjReuniao | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (reuniao: RjReuniao) => void;
  onChangeStatus: (id: string, status: RjReuniaoStatus, resultado?: string | null) => void;
  onDelete: (reuniao: RjReuniao) => void;
  statusPending: boolean;
  deletePending: boolean;
}) {
  const [resultado, setResultado] = useState("");
  const [askResultado, setAskResultado] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [mobileCalendarPending, setMobileCalendarPending] = useState(false);

  const googleStatusQuery = useQuery({
    queryKey: ["rj-google-integracao"],
    queryFn: fetchRjGoogleIntegracaoStatus,
    enabled: open,
  });
  const googleSynced = googleStatusQuery.data?.conectado === true;

  if (!reuniao) return null;

  const handleRealizada = () => {
    if (!askResultado) {
      setResultado(reuniao.resultado ?? "");
      setAskResultado(true);
      return;
    }
    onChangeStatus(reuniao.id, "realizada", resultado.trim() || null);
    setAskResultado(false);
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `Excluir a reunião "${reuniao.titulo}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    onDelete(reuniao);
  };

  const handleMobileCalendar = async () => {
    setCalendarError(null);
    setMobileCalendarPending(true);
    try {
      await addRjReuniaoToDeviceCalendar(reuniao.id, reuniao.titulo);
    } catch (e) {
      const msg = humanizeErrorMessage(e, "calendar");
      if (msg) setCalendarError(msg);
    } finally {
      setMobileCalendarPending(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title={reuniao.titulo}>
      <div className="space-y-4 text-[13px]">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${RJ_REUNIAO_STATUS_PILL_CLASS[reuniao.status]}`}
          >
            {RJ_REUNIAO_STATUS_LABELS[reuniao.status]}
          </span>
        </div>

        <DetailRow label="Credor" value={reuniao.credor.nome} />
        <DetailRow label="Início" value={formatRjDateTime(reuniao.dataHoraInicio)} />
        <DetailRow label="Término" value={formatRjDateTime(reuniao.dataHoraFim)} />
        {reuniao.local && <DetailRow label="Local" value={reuniao.local} />}
        {reuniao.linkOnline && (
          <div>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Link
            </span>
            <a
              href={reuniao.linkOnline}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-azul-corporativo hover:text-ouro-escuro"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir chamada
            </a>
          </div>
        )}
        {reuniao.pauta && <DetailRow label="Pauta" value={reuniao.pauta} multiline />}
        {reuniao.resultado && <DetailRow label="Resultado" value={reuniao.resultado} multiline />}

        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Participantes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {reuniao.participantes.map((p) => (
              <span
                key={p.userId}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] text-slate-700"
              >
                {p.nome}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Adicionar ao calendário
          </p>
          {googleSynced && (
            <p className="flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] text-emerald-800">
              <RefreshCw className="h-3 w-3 shrink-0" />
              Sincronizado automaticamente com seu Google Calendar (CAIS · RJ)
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              className="w-full text-[12px]"
              onClick={() => openCalendarUrl(googleCalendarAddUrl(reuniao))}
            >
              <CalendarPlus className="h-4 w-4" /> Google Calendar
            </Button>
            <Button
              variant="ghost"
              className="w-full text-[12px]"
              onClick={() => openCalendarUrl(outlookCalendarAddUrl(reuniao))}
            >
              <CalendarPlus className="h-4 w-4" /> Outlook
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-[12px]"
            disabled={mobileCalendarPending}
            onClick={() => void handleMobileCalendar()}
          >
            <Smartphone className="h-4 w-4" />
            {mobileCalendarPending ? "Abrindo…" : "Calendário do celular"}
          </Button>
          <p className="text-[11px] leading-relaxed text-slate-500">
            No celular, abre o app Calendário ou o menu Compartilhar para escolher onde salvar.
          </p>
          {calendarError && (
            <p className="text-[11px] text-red-600">{calendarError}</p>
          )}
        </div>

        {canManage && (
          <div className="space-y-2 border-t border-slate-200 pt-4">
            {askResultado && (
              <textarea
                className={`${inputClass} min-h-[70px] resize-y`}
                placeholder="Resumo do que foi decidido na reunião"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="gold" onClick={handleRealizada} disabled={statusPending}>
                {askResultado ? "Confirmar realizada" : "Marcar como realizada"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => onChangeStatus(reuniao.id, "naocompareceu")}
                disabled={statusPending}
              >
                Não compareceu
              </Button>
              <Button
                variant="ghost"
                onClick={() => onChangeStatus(reuniao.id, "cancelada")}
                disabled={statusPending}
              >
                Cancelar reunião
              </Button>
              <Button variant="ghost" onClick={() => onEdit(reuniao)} disabled={statusPending}>
                Editar
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full border border-red-200 text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={deletePending || statusPending}
            >
              <Trash2 className="h-4 w-4" />
              {deletePending ? "Excluindo…" : "Excluir reunião"}
            </Button>
          </div>
        )}
      </div>
    </SlideOver>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <p className={`text-azul-profundo ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}
