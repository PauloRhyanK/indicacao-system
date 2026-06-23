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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:p-0">
      <style>{`
        @media print {
          @page {
            margin: 1cm 1.2cm;
            size: A4 portrait;
          }
          body {
            background-color: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid !important;
          }
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

      {/* Floating Toolbar (Screen Only) */}
      <div className="no-print sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link
          to="/credores"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-azul-profundo transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o painel
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-md bg-azul-profundo px-5 py-2.5 text-[13px] font-semibold text-branco shadow hover:bg-azul-marinho transition-all active:scale-95 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-[28cm] mx-auto bg-white print:max-w-none print:shadow-none p-8 shadow-sm my-8 print:my-0 print:p-0">
        
        {/* Report Header - Clean Look */}
        <div className="border-b border-slate-300 pb-6 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              CAIS Investimentos · Controle Interno
            </div>
            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
              Relatório Executivo
              <span className="block text-[18px] font-normal text-slate-600 mt-1">
                Condomínio de Credores MG2
              </span>
            </h1>
          </div>
          <div className="text-right text-[11px] text-slate-500 flex flex-col gap-1">
            <div>
              <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400 mr-2">Gerado em</span>
              <span className="font-medium text-slate-800">{formattedDate}</span>
            </div>
            <div>
              <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400 mr-2">Total de Credores</span>
              <span className="font-medium text-slate-800">{kpis.count} registros</span>
            </div>
          </div>
        </div>

        {/* KPI Section - Minimalist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print-break-avoid">
          <div className="border border-slate-200 rounded p-4 bg-slate-50/50 print:bg-white print:border-slate-300">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Voto Confirmado
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular-nums mb-1">
              {formatRjCurrency(kpis.votoConf)}
            </div>
            {representatividade.confPct !== null && (
              <div className="text-[11px] font-medium text-emerald-700">
                {representatividade.confPct.toFixed(1)}% do Passivo Geral
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded p-4 bg-slate-50/50 print:bg-white print:border-slate-300">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Voto Sujeito (Total)
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular-nums mb-1">
              {formatRjCurrency(kpis.votoTotal)}
            </div>
            {representatividade.confPct !== null && representatividade.pendPct !== null && (
              <div className="text-[11px] font-medium text-slate-500">
                {((kpis.votoTotal / config.passivo) * 100).toFixed(1)}% do Passivo Geral
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded p-4 bg-slate-50/50 print:bg-white print:border-slate-300">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Fora da RJ
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular-nums mb-1">
              {formatRjCurrency(kpis.foraTotal)}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              {kpis.foraCount} credor(es) sem voto
            </div>
          </div>

          <div className="border border-slate-200 rounded p-4 bg-slate-100 print:bg-white print:border-slate-300">
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Passivo Declarado
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular-nums mb-1">
              {config.passivo ? formatRjCurrency(config.passivo) : "—"}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Valor de Referência Oficial
            </div>
          </div>
        </div>

        {/* Class Breakdown Section */}
        <div className="mb-10 print-break-avoid">
          <h2 className="text-[14px] font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200 print:border-slate-300">
            Resumo Analítico por Classe
          </h2>
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-2 w-[40%] font-semibold">Classe Estrutural</th>
                <th className="py-2 px-2 text-center font-semibold">Quantidade</th>
                <th className="py-2 px-2 text-right font-semibold">Valor Consolidado</th>
                <th className="py-2 px-2 text-right font-semibold">Participação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Classe I — Trabalhista</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-slate-700">{classes.I.count}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-900">{formatRjCurrency(classes.I.valor)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                  {kpis.votoTotal ? `${((classes.I.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Classe II — Garantia Real</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-slate-700">{classes.II.count}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-900">{formatRjCurrency(classes.II.valor)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                  {kpis.votoTotal ? `${((classes.II.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Classe III — Quirografário</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-slate-700">{classes.III.count}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-900">{formatRjCurrency(classes.III.valor)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                  {kpis.votoTotal ? `${((classes.III.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Classe IV — ME / EPP</td>
                <td className="py-2.5 px-2 text-center tabular-nums text-slate-700">{classes.IV.count}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-900">{formatRjCurrency(classes.IV.valor)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                  {kpis.votoTotal ? `${((classes.IV.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
              <tr className="text-slate-500">
                <td className="py-2.5 px-2 font-medium italic">Fora da RJ (Sem direito a voto)</td>
                <td className="py-2.5 px-2 text-center tabular-nums">{classes.fora.count}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{formatRjCurrency(classes.fora.valor)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Creditors Section */}
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200 print:border-slate-300">
            Detalhamento de Credores
          </h2>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="py-2 px-1 w-[30%] font-semibold">Nome do Credor</th>
                <th className="py-2 px-1 w-[10%] font-semibold">Enquadramento</th>
                <th className="py-2 px-1 w-[20%] text-right font-semibold">Valor R$</th>
                <th className="py-2 px-1 w-[15%] font-semibold">Status Interno</th>
                <th className="py-2 px-1 w-[25%] font-semibold">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {credores.map((c: RjCredor) => (
                <tr key={c.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="py-2.5 px-1 font-medium text-slate-900 align-top">
                    <div className="line-clamp-2">{c.nome}</div>
                    {!c.sujeito && (
                      <span className="inline-block mt-0.5 text-[8px] font-medium text-slate-400 uppercase tracking-wider">
                        Não Vota
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-1 align-top text-slate-700">
                    {c.sujeito ? (
                      <span>Classe {c.classe}</span>
                    ) : (
                      <span className="text-slate-500">
                        {c.motivo ? RJ_MOTIVO_LABELS[c.motivo as keyof typeof RJ_MOTIVO_LABELS] : "Outro"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-1 text-right align-top font-medium tabular-nums text-slate-900">
                    {c.valor ? formatRjCurrency(c.valor) : <span className="text-slate-400 italic">A definir</span>}
                  </td>
                  <td className="py-2.5 px-1 align-top">
                    <span className="text-[10px] font-medium text-slate-700">
                      {RJ_STATUS_LABELS[c.status as keyof typeof RJ_STATUS_LABELS] ?? c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-1 align-top text-slate-600 text-[10px] break-all">
                    {c.contato || <span className="text-slate-400 italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Report Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between print:border-slate-300">
          <div className="text-[10px] font-medium text-slate-400">
            CAIS Investimentos · Relatório Gerencial
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Uso Interno Exclusivo · Confidencial
          </div>
        </div>
      </div>
    </div>
  );
}
