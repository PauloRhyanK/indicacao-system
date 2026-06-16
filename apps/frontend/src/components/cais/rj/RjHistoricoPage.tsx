import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { inputClass } from "@/components/cais/SlideOver";
import {
  fetchRjHistorico,
  type RjAuditEntityType,
  type RjAuditLogEntry,
} from "@/lib/cais-api";
import { RJ_ACTION_LABELS, RJ_ENTITY_TYPE_LABELS } from "@/lib/rj-constants";
import { cn } from "@/lib/utils";

const ENTITY_TYPES: { value: RjAuditEntityType | ""; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "credor", label: "Credores" },
  { value: "config", label: "Configuração" },
  { value: "usuario", label: "Usuários" },
  { value: "papel", label: "Papéis" },
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoricoRow({ entry }: { entry: RjAuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasChanges = Boolean(entry.changes?.length);

  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
        <td className="px-4 py-3 align-top text-[12px] text-slate-600 whitespace-nowrap">
          {formatWhen(entry.createdAt)}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-[13px] font-medium text-azul-profundo">{entry.actorName}</div>
          <div className="text-[11px] text-slate-500">{entry.actorEmail}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {RJ_ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}
          </span>
          <div className="mt-1 text-[12px] text-azul-profundo">{entry.entityLabel}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-start gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-0.5 shrink-0 text-slate-400 hover:text-azul-profundo"
                aria-label={open ? "Recolher detalhes" : "Expandir detalhes"}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {RJ_ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <p className="mt-0.5 text-[13px] text-slate-700">{entry.summary}</p>
            </div>
          </div>
        </td>
      </tr>
      {open && hasChanges && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={4} className="px-4 py-3">
            <ul className="space-y-1.5">
              {entry.changes!.map((c) => (
                <li
                  key={`${entry.id}-${c.field}`}
                  className="flex flex-wrap items-baseline gap-x-2 text-[12px]"
                >
                  <span className="font-medium text-azul-profundo">{c.label}:</span>
                  <span className="text-slate-500 line-through">{c.oldValue ?? "—"}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium text-emerald-800">{c.newValue ?? "—"}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export function RjHistoricoPage() {
  const [entityType, setEntityType] = useState<RjAuditEntityType | "">("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["rj-historico", entityType, q, from, to, page],
    queryFn: () =>
      fetchRjHistorico({
        page,
        limit: 50,
        entityType: entityType || undefined,
        q: q.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;

  return (
    <>
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          Auditoria · Administrador RJ
        </div>
        <h1 className="text-[26px] font-semibold text-azul-profundo">Histórico</h1>
        <p className="text-[14px] text-slate-500">
          Registro de alterações em credores, passivo, usuários e papéis do ambiente confidencial.
        </p>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-branco p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Tipo</label>
          <select
            className={cn(inputClass, "text-[13px]")}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as RjAuditEntityType | "");
              setPage(1);
            }}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value || "all"} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Busca</label>
          <input
            className={cn(inputClass, "text-[13px]")}
            placeholder="Nome, e-mail, resumo…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">De</label>
          <input
            type="date"
            className={cn(inputClass, "text-[13px]")}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Até</label>
          <input
            type="date"
            className={cn(inputClass, "text-[13px]")}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-[14px] text-slate-500">Carregando histórico…</p>
      ) : query.isError ? (
        <p className="text-[14px] text-red-600">Não foi possível carregar o histórico.</p>
      ) : !query.data?.items.length ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="font-medium text-azul-profundo">Nenhum registro encontrado</p>
          <p className="mt-1 text-[13px] text-slate-500">
            O histórico passa a registrar ações a partir do deploy desta versão.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-branco">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Quem</th>
                  <th className="px-4 py-3">O quê</th>
                  <th className="px-4 py-3">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((entry) => (
                  <HistoricoRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-600">
            <span>
              {query.data.total} registro{query.data.total !== 1 ? "s" : ""} · página {query.data.page}{" "}
              de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
