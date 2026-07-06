import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Columns3, Pencil } from "lucide-react";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { cn } from "@/lib/utils";
import {
  INVEST_ETAPAS,
  INVEST_ETAPA_INFO,
  fetchInvestLeadsGrid,
  formatBRL,
  formatBRLCompact,
  formatInvestRetorno,
  investOrigemLabel,
  investProdutoLabel,
  investRetornoSoon,
  investWeighted,
  type InvestEtapa,
  type InvestLead,
} from "@/lib/invest-api";

type Recorte = "todos" | "meus" | "sem-responsavel";

const COLS = [
  { key: "origem", label: "Origem / Produto" },
  { key: "pl", label: "PL · Previsão" },
  { key: "etapa", label: "Etapa · Prob." },
  { key: "faixa", label: "Faixa" },
  { key: "vendedor", label: "Vendedor" },
  { key: "passo", label: "Próximo passo" },
  { key: "retorno", label: "Retorno" },
] as const;

type ColKey = (typeof COLS)[number]["key"];
const COLS_KEY = "cais-invest-cols";
const DEFAULT_COLS: ColKey[] = ["origem", "pl", "etapa", "faixa", "passo", "retorno"];

function loadCols(): ColKey[] {
  if (typeof window === "undefined") return DEFAULT_COLS;
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_COLS;
}

export function InvestLeadsGrid({
  recorte,
  respFilter,
  etapaFilter,
  search,
  canEdit,
  onEdit,
  onEtapa,
}: {
  recorte: Recorte;
  respFilter: string;
  etapaFilter: "all" | InvestEtapa;
  search: string;
  canEdit: boolean;
  onEdit: (lead: InvestLead) => void;
  onEtapa: (id: string, etapa: InvestEtapa) => void;
}) {
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState<ColKey[]>(loadCols);
  const [colsOpen, setColsOpen] = useState(false);

  const scope = recorte === "meus" ? "mine" : recorte === "sem-responsavel" ? "unassigned" : "all";

  // Reset para a 1ª página quando os filtros mudam.
  useEffect(() => {
    setPage(1);
  }, [recorte, respFilter, etapaFilter, search]);

  useEffect(() => {
    localStorage.setItem(COLS_KEY, JSON.stringify(visible));
  }, [visible]);

  const grid = useQuery({
    queryKey: ["invest-grid", scope, respFilter, etapaFilter, search, page],
    queryFn: () =>
      fetchInvestLeadsGrid({
        page,
        limit: 25,
        q: search.trim() || undefined,
        responsavel: respFilter !== "all" ? respFilter : undefined,
        scope,
        etapa: etapaFilter !== "all" ? etapaFilter : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = grid.data?.leads ?? [];
  const pag = grid.data?.pagination;
  const agg = grid.data?.aggregate;
  const showCol = (k: ColKey) => visible.includes(k);

  const toggleCol = (k: ColKey) =>
    setVisible((prev) => (prev.includes(k) ? prev.filter((c) => c !== k) : [...prev, k]));

  const summaryLabel = useMemo(() => {
    if (respFilter !== "all") return respFilter;
    if (recorte === "meus") return "Meus leads";
    if (recorte === "sem-responsavel") return "Sem responsável";
    return "Todos os leads ativos";
  }, [respFilter, recorte]);

  return (
    <div className="space-y-3">
      {/* Resumo de pipe do recorte + config de colunas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-branco px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
          <span className="font-semibold text-azul-profundo">{summaryLabel}</span>
          <span className="text-slate-500">
            Pipe total{" "}
            <strong className="tabular-nums text-ouro-escuro">
              {formatBRLCompact(agg?.pipeTotal ?? 0)}
            </strong>
          </span>
          <span className="text-slate-500">
            Ponderado{" "}
            <strong className="tabular-nums text-ouro-escuro">
              {formatBRLCompact(agg?.pipePonderado ?? 0)}
            </strong>
          </span>
          <span className="text-slate-400">{pag?.total ?? 0} leads</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-ouro"
          >
            <Columns3 className="h-3.5 w-3.5" /> Colunas
          </button>
          {colsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-slate-200 bg-branco p-2 shadow-lg">
                {COLS.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={showCol(c.key)}
                      onChange={() => toggleCol(c.key)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {grid.isLoading ? (
        <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
          <p className="text-sm font-semibold text-slate-600">Nenhum lead neste filtro</p>
          <p className="mt-1 text-xs text-slate-400">Cadastre um novo ou ajuste a busca.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-branco">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10.5px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Lead / Cliente</th>
                  {showCol("origem") && <th className="px-4 py-3 font-semibold">Origem / Produto</th>}
                  {showCol("pl") && <th className="px-4 py-3 text-right font-semibold">PL · Previsão</th>}
                  {showCol("etapa") && <th className="px-4 py-3 font-semibold">Etapa · Prob.</th>}
                  {showCol("faixa") && <th className="px-4 py-3 font-semibold">Faixa</th>}
                  {showCol("vendedor") && <th className="px-4 py-3 font-semibold">Vendedor</th>}
                  {showCol("passo") && <th className="px-4 py-3 font-semibold">Próximo passo</th>}
                  {showCol("retorno") && <th className="px-4 py-3 font-semibold">Retorno</th>}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const info = INVEST_ETAPA_INFO[l.etapa];
                  const isClosed = l.etapa === "ganho" || l.etapa === "perdido";
                  return (
                    <tr
                      key={l.id}
                      className={cn(
                        "border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70",
                        l.etapa === "ganho" && "shadow-[inset_3px_0_0_#2f8f5b]",
                        l.etapa === "perdido" && "bg-slate-50/50 shadow-[inset_3px_0_0_#bd5440]",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-azul-profundo">
                          {l.nome}
                          {l.abaixo_do_piso && (
                            <span title="Abaixo de R$ 1 mi" className="text-amber-500">
                              ⚠
                            </span>
                          )}
                        </div>
                        {l.contato && <div className="mt-0.5 text-[11px] text-slate-400">{l.contato}</div>}
                      </td>
                      {showCol("origem") && (
                        <td className="px-4 py-3">
                          <span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {investOrigemLabel(l.origem)}
                          </span>
                          <div className="mt-0.5 text-[10.5px] text-slate-400">
                            {investProdutoLabel(l.produto)}
                            {l.pitch ? ` · ${l.pitch}` : ""}
                          </div>
                        </td>
                      )}
                      {showCol("pl") && (
                        <td className="px-4 py-3 text-right">
                          {l.pl ? (
                            <>
                              <span className="tabular-nums font-medium text-ouro-escuro">
                                {formatBRL(l.pl)}
                              </span>
                              {!isClosed && (
                                <div className="text-[10.5px] text-slate-400">
                                  → {formatBRLCompact(investWeighted(l))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs italic text-slate-400">a definir</span>
                          )}
                        </td>
                      )}
                      {showCol("etapa") && (
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {canEdit ? (
                              <select
                                value={l.etapa}
                                onChange={(e) => onEtapa(l.id, e.target.value as InvestEtapa)}
                                className="cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                                style={{ color: info.color, backgroundColor: info.bg, borderColor: info.color }}
                              >
                                {INVEST_ETAPAS.map((e) => (
                                  <option key={e} value={e}>
                                    {INVEST_ETAPA_INFO[e].label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className="rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                                style={{ color: info.color, backgroundColor: info.bg, borderColor: info.color }}
                              >
                                {info.label}
                              </span>
                            )}
                            {!isClosed && (
                              <span className="text-[11px] tabular-nums text-slate-400">
                                × {l.probabilidade}%
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {showCol("faixa") && (
                        <td className="px-4 py-3">
                          <InvestFaixaTag faixa={l.faixa} />
                        </td>
                      )}
                      {showCol("vendedor") && (
                        <td className="px-4 py-3 text-[12px] text-slate-600">
                          {l.vendedor?.name ?? "—"}
                        </td>
                      )}
                      {showCol("passo") && (
                        <td className="max-w-[230px] px-4 py-3 text-xs text-slate-600">
                          {l.passo || "—"}
                        </td>
                      )}
                      {showCol("retorno") && (
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              investRetornoSoon(l.retorno) ? "font-semibold text-ouro-escuro" : "text-slate-500",
                            )}
                          >
                            {formatInvestRetorno(l.retorno)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title={canEdit ? "Editar" : "Ver detalhes"}
                          onClick={() => onEdit(l)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-ouro/20 hover:text-azul-profundo"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação */}
      {pag && pag.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="tabular-nums">
            Página {pag.page} de {pag.totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={page >= pag.totalPages}
              onClick={() => setPage((p) => Math.min(pag.totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
