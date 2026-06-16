import { Pencil, Trash2 } from "lucide-react";
import type { RjCredor, RjStatus } from "@/lib/cais-api";
import {
  RJ_MOTIVO_LABELS,
  RJ_STATUS_LABELS,
  RJ_STATUS_PILL_CLASS,
  RJ_STATUS_VALUES,
} from "@/lib/rj-constants";
import {
  formatRjCurrency,
  formatRjDateShort,
  isRjRetornoSoon,
} from "@/lib/rj-format";
import { cn } from "@/lib/utils";

export function RjCredoresTable({
  credores,
  canManage,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  credores: RjCredor[];
  canManage: boolean;
  onEdit: (credor: RjCredor) => void;
  onDelete: (credor: RjCredor) => void;
  onStatusChange: (id: string, status: RjStatus) => void;
}) {
  if (!credores.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="font-medium text-azul-profundo">Nenhum credor neste filtro</p>
        <p className="mt-1 text-[13px] text-slate-500">
          Cadastre um novo ou ajuste a busca.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-branco">
      <table className="w-full min-w-[800px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Credor</th>
            <th className="px-4 py-3">Classe / Motivo</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">Próximo passo</th>
            <th className="hidden px-4 py-3 md:table-cell">Retorno</th>
            {canManage && <th className="px-4 py-3 w-20" />}
          </tr>
        </thead>
        <tbody>
          {credores.map((c) => (
            <tr
              key={c.id}
              className={cn(
                "border-b border-slate-100 last:border-0",
                !c.sujeito && "bg-slate-50/80 opacity-80",
              )}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-azul-profundo">
                  {c.nome}
                  {!c.sujeito && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      não vota
                    </span>
                  )}
                </div>
                {c.contato && (
                  <div className="mt-0.5 text-[11px] text-slate-500">{c.contato}</div>
                )}
              </td>
              <td className="px-4 py-3">
                {c.sujeito ? (
                  <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium">
                    Classe {c.classe}
                  </span>
                ) : (
                  <div>
                    <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800">
                      Fora da RJ
                    </span>
                    {c.motivo && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        {RJ_MOTIVO_LABELS[c.motivo]}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td
                className={cn(
                  "px-4 py-3 tabular-nums",
                  c.valor ? (c.sujeito ? "text-azul-profundo" : "text-slate-500") : "text-slate-400",
                )}
              >
                {c.valor ? formatRjCurrency(c.valor) : "a definir"}
              </td>
              <td className="px-4 py-3">
                {canManage ? (
                  <select
                    value={c.status}
                    onChange={(e) => onStatusChange(c.id, e.target.value as RjStatus)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium focus:outline-hidden",
                      RJ_STATUS_PILL_CLASS[c.status],
                    )}
                  >
                    {RJ_STATUS_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {RJ_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={cn(
                      "inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      RJ_STATUS_PILL_CLASS[c.status],
                    )}
                  >
                    {RJ_STATUS_LABELS[c.status]}
                  </span>
                )}
              </td>
              <td className="hidden max-w-[220px] truncate px-4 py-3 text-slate-600 md:table-cell">
                {c.passo || "—"}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span
                  className={cn(
                    "tabular-nums",
                    isRjRetornoSoon(c.retorno) && "font-semibold text-amber-700",
                  )}
                >
                  {formatRjDateShort(c.retorno)}
                </span>
              </td>
              {canManage && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-azul-profundo"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
