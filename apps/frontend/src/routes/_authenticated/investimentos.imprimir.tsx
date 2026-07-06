import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import {
  INVEST_FAIXA_INFO,
  fetchInvestLeads,
  formatBRL,
  formatInvestRetorno,
  investOrigemLabel,
  type InvestLead,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/imprimir")({
  head: () => ({ meta: [{ title: "Imprimir · Investimentos — CAIS" }] }),
  validateSearch: (search: Record<string, unknown>): { responsavel?: string } => ({
    responsavel: typeof search.responsavel === "string" ? search.responsavel : undefined,
  }),
  component: InvestImprimirPage,
});

const ETAPA_ORD: Record<string, number> = {
  negociacao: 0,
  proposta: 1,
  reuniao: 2,
  qualificado: 3,
  contato: 4,
  lead: 5,
  ganho: 6,
  perdido: 7,
};

function InvestImprimirPage() {
  const { responsavel } = Route.useSearch();
  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });

  const leads = useMemo(() => {
    const all = data.data?.leads ?? [];
    const filtered = responsavel
      ? all.filter((l) => l.responsavel_nome === responsavel)
      : all;
    return [...filtered]
      .filter((l) => l.etapa !== "perdido")
      .sort(
        (a, b) =>
          (ETAPA_ORD[a.etapa] ?? 9) - (ETAPA_ORD[b.etapa] ?? 9) ||
          b.pl - a.pl ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
  }, [data.data, responsavel]);

  const totalPl = leads.reduce((s, l) => s + l.pl, 0);
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8 print:px-0 print:py-0">
      <style>{`@media print { @page { margin: 16mm; } .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <div className="no-print mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-azul-profundo px-4 py-2.5 text-sm font-medium text-branco hover:bg-azul-marinho"
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>

      <header className="mb-5 flex items-end justify-between border-b-2 border-ouro pb-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ouro-escuro">
            CAIS Investimentos · BNF
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-azul-profundo">
            Agenda de trabalho{responsavel ? ` — ${responsavel}` : ""}
          </h1>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          <div>{hoje}</div>
          <div className="tabular-nums">
            {leads.length} leads · {formatBRL(totalPl)}
          </div>
        </div>
      </header>

      {data.isLoading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum lead para este responsável.</p>
      ) : (
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-semibold">Lead</th>
              <th className="py-2 pr-3 font-semibold">Faixa</th>
              <th className="py-2 pr-3 text-right font-semibold">PL</th>
              <th className="py-2 pr-3 font-semibold">Próximo passo</th>
              <th className="py-2 font-semibold">Retorno</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: InvestLead) => (
              <tr key={l.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <div className="font-semibold text-azul-profundo">{l.nome}</div>
                  <div className="text-[10.5px] text-slate-400">
                    {investOrigemLabel(l.origem)}
                    {l.contato ? ` · ${l.contato}` : ""}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  {l.faixa ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: INVEST_FAIXA_INFO[l.faixa].color,
                        backgroundColor: INVEST_FAIXA_INFO[l.faixa].bg,
                      }}
                    >
                      {INVEST_FAIXA_INFO[l.faixa].label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ouro-escuro">
                  {l.pl ? formatBRL(l.pl) : "—"}
                </td>
                <td className="py-2 pr-3 text-slate-700">{l.passo || "—"}</td>
                <td className="py-2 tabular-nums text-slate-600">
                  {formatInvestRetorno(l.retorno)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-6 text-[10px] text-slate-400">
        CAIS Investimentos · uso interno · gerado em {hoje}
      </footer>
    </div>
  );
}
