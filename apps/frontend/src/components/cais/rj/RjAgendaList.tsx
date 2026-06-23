import { Video, ExternalLink } from "lucide-react";
import type { RjReuniao } from "@/lib/cais-api";
import {
  RJ_REUNIAO_STATUS_LABELS,
  RJ_REUNIAO_STATUS_PILL_CLASS,
} from "@/lib/rj-constants";
import { formatRjDateTime } from "@/lib/rj-format";

export function RjAgendaList({
  reunioes,
  onSelect,
}: {
  reunioes: RjReuniao[];
  onSelect: (reuniao: RjReuniao) => void;
}) {
  if (reunioes.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
        Nenhuma reunião neste período.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Data/Hora</th>
            <th className="px-4 py-3 font-medium">Credor</th>
            <th className="px-4 py-3 font-medium">Participantes</th>
            <th className="px-4 py-3 font-medium">Local</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {reunioes.map((r) => (
            <tr
              key={r.id}
              className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              onClick={() => onSelect(r)}
            >
              <td className="px-4 py-3 text-azul-profundo">{formatRjDateTime(r.dataHoraInicio)}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-azul-profundo">{r.credor.nome}</div>
                <div className="text-[12px] text-slate-500">{r.titulo}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.participantes.length > 0
                  ? `${r.participantes.length} pessoa(s)`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                <div className="flex flex-col gap-1 items-start">
                  <span>{r.local || "—"}</span>
                  {r.linkOnline && (
                    <a
                      href={r.linkOnline}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                        r.linkOnline.includes("meet.google.com")
                          ? "bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      <span>{r.linkOnline.includes("meet.google.com") ? "Google Meet" : "Chamada"}</span>
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${RJ_REUNIAO_STATUS_PILL_CLASS[r.status]}`}
                >
                  {RJ_REUNIAO_STATUS_LABELS[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
