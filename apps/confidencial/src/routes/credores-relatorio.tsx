import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { fetchMe, isAuthenticated, isConfidencialApproved } from "@/lib/api/auth";
import { fetchRjCredores, type RjCredor } from "@/lib/cais-api";
import { RJ_MOTIVO_LABELS, RJ_STATUS_LABELS } from "@/lib/rj-constants";
import { formatRjCurrency } from "@/lib/rj-format";

export const Route = createFileRoute("/credores-relatorio")({
  ssr: false,
  beforeLoad: async () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
    try {
      const session = await fetchMe();
      if (session.user.accessScope === "INTERNAL") {
        throw redirect({ to: "/acesso-negado" });
      }
      if (session.user.mustChangePassword) {
        throw redirect({ to: "/primeiro-acesso" });
      }
      if (!session.permissions.includes("rj.view")) {
        throw redirect({ to: "/acesso-negado" });
      }
      if (!isConfidencialApproved(session.user)) {
        throw redirect({ to: "/aguardando-aprovacao" });
      }
      return { user: session.user, permissions: session.permissions };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: RjCredoresRelatorioPage,
});

function RjCredoresRelatorioPage() {
  const query = useQuery({
    queryKey: ["rj-credores"],
    queryFn: fetchRjCredores,
  });

  if (query.isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium text-[14px]">
        Carregando dados do relatório…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-8 text-center text-red-600 font-medium text-[14px]">
        Não foi possível carregar os credores para o relatório.
      </div>
    );
  }

  const { credores, kpis, classes, config, representatividade } = query.data!;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-10 font-sans print:p-0">
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>

      {/* Floating Toolbar */}
      <div className="no-print mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          to="/credores"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-azul-profundo transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o painel
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-md bg-azul-profundo px-4 py-2 text-[13px] font-medium text-branco hover:bg-azul-marinho transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Report Header */}
      <div className="border-b-2 border-slate-900 pb-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1">
              CAIS Investimentos · Controle Interno
            </div>
            <h1 className="text-[26px] font-bold text-slate-950 uppercase tracking-tight">
              Relatório de Credores · Condomínio MG2
            </h1>
            <p className="text-[13px] text-slate-600 mt-0.5">
              Posição consolidada da Recuperação Judicial
            </p>
          </div>
          <div className="text-right md:text-right text-[11px] text-slate-500">
            <div>Gerado em: <span className="font-semibold text-slate-800">{formattedDate}</span></div>
            <div>Total de Credores: <span className="font-semibold text-slate-800">{kpis.count}</span></div>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Voto Confirmado (Confirmados)
          </div>
          <div className="text-[18px] font-bold text-slate-950 mt-1 tabular-nums">
            {formatRjCurrency(kpis.votoConf)}
          </div>
          {representatividade.confPct !== null && (
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {representatividade.confPct.toFixed(1)}% do Passivo Geral
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Voto Total (Sujeitos a RJ)
          </div>
          <div className="text-[18px] font-bold text-slate-950 mt-1 tabular-nums">
            {formatRjCurrency(kpis.votoTotal)}
          </div>
          {representatividade.confPct !== null && representatividade.pendPct !== null && (
            <div className="text-[11px] text-slate-600 mt-0.5">
              {((kpis.votoTotal / config.passivo) * 100).toFixed(1)}% do Passivo Geral
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Fora da RJ (Não Vota)
          </div>
          <div className="text-[18px] font-bold text-slate-950 mt-1 tabular-nums">
            {formatRjCurrency(kpis.foraTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {kpis.foraCount} credor(es)
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50">
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Passivo Geral Declarado
          </div>
          <div className="text-[18px] font-bold text-slate-950 mt-1 tabular-nums">
            {config.passivo ? formatRjCurrency(config.passivo) : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Valor de referência
          </div>
        </div>
      </div>

      {/* Class Breakdown Section */}
      <div className="mb-8">
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-200 pb-1.5">
          Resumo por Classe de Credores
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-semibold bg-slate-50">
                <th className="py-2 px-3">Classe</th>
                <th className="py-2 px-3 text-right">Quantidade</th>
                <th className="py-2 px-3 text-right">Valor Total</th>
                <th className="py-2 px-3 text-right">% do Voto Sujeito</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-medium">Classe I — Trabalhista</td>
                <td className="py-2 px-3 text-right tabular-nums">{classes.I.count}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatRjCurrency(classes.I.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {kpis.votoTotal ? `${((classes.I.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-medium">Classe II — Garantia real</td>
                <td className="py-2 px-3 text-right tabular-nums">{classes.II.count}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatRjCurrency(classes.II.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {kpis.votoTotal ? `${((classes.II.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-medium">Classe III — Quirografário</td>
                <td className="py-2 px-3 text-right tabular-nums">{classes.III.count}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatRjCurrency(classes.III.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {kpis.votoTotal ? `${((classes.III.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-medium">Classe IV — ME / EPP</td>
                <td className="py-2 px-3 text-right tabular-nums">{classes.IV.count}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatRjCurrency(classes.IV.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {kpis.votoTotal ? `${((classes.IV.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="py-2 px-3 font-medium text-slate-500">Fora da RJ (Sem direito a voto)</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-600">{classes.fora.count}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-600">{formatRjCurrency(classes.fora.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Creditors Section */}
      <div>
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-200 pb-1.5">
          Listagem Geral de Credores (Ordem de Relevância)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-semibold bg-slate-50 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-2.5">Credor</th>
                <th className="py-2 px-2.5">Situação / Classe</th>
                <th className="py-2 px-2.5 text-right">Valor</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5">Próximo Passo</th>
                <th className="py-2 px-2.5">Retorno</th>
                <th className="py-2 px-2.5">Contato</th>
              </tr>
            </thead>
            <tbody>
              {credores.map((c: RjCredor) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-200 hover:bg-slate-50 print:hover:bg-white"
                >
                  <td className="py-2 px-2.5 font-semibold text-slate-900">
                    {c.nome}
                    {!c.sujeito && (
                      <span className="ml-1.5 rounded bg-slate-100 border border-slate-200 px-1 py-0.5 text-[9px] font-medium text-slate-500 uppercase">
                        não vota
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2.5">
                    {c.sujeito ? (
                      <span>Classe {c.classe}</span>
                    ) : (
                      <span className="text-slate-500">
                        Fora ({c.motivo ? RJ_MOTIVO_LABELS[c.motivo as keyof typeof RJ_MOTIVO_LABELS] : "Outro"})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 text-right font-medium tabular-nums text-slate-900">
                    {c.valor ? formatRjCurrency(c.valor) : "a definir"}
                  </td>
                  <td className="py-2 px-2.5">
                    <span className="font-semibold text-slate-800">
                      {RJ_STATUS_LABELS[c.status as keyof typeof RJ_STATUS_LABELS] ?? c.status}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 max-w-[180px] truncate text-slate-700">
                    {c.passo || "—"}
                  </td>
                  <td className="py-2 px-2.5 tabular-nums text-slate-700">
                    {c.retorno ? c.retorno.split("-").reverse().slice(0, 2).join("/") : "—"}
                  </td>
                  <td className="py-2 px-2.5 text-slate-600 max-w-[140px] truncate">
                    {c.contato || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Report Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        CAIS Investimentos · Relatório Gerencial Confidencial · Uso Interno Exclusivo
      </div>
    </div>
  );
}
