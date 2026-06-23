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
            margin: 1.2cm 1.5cm;
            size: A4 portrait;
          }
          body {
            background-color: white !important;
            color: #0f172a !important; /* slate-900 */
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
          /* Custom scrollbar hide for print */
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

      <div className="max-w-[21cm] mx-auto bg-white print:max-w-none print:shadow-none p-8 md:p-12 shadow-sm my-8 print:my-0 print:p-0">
        
        {/* Report Header - Premium Look */}
        <div className="border-b-2 border-slate-900 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 print:border-slate-800">
          <div>
            <div className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase mb-4 rounded-sm print:bg-slate-800">
              CAIS Investimentos · Controle Interno
            </div>
            <h1 className="text-[32px] font-extrabold text-slate-900 uppercase tracking-tight leading-tight print:text-[28px]">
              Relatório Executivo
              <span className="block text-[22px] font-medium text-slate-500 mt-1 print:text-[18px]">
                Condomínio de Credores MG2
              </span>
            </h1>
          </div>
          <div className="text-right text-[12px] text-slate-500 flex flex-col gap-1.5">
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100 print:border-none print:bg-transparent print:p-0">
              <div className="uppercase tracking-wider text-[9px] font-bold text-slate-400 mb-0.5">Gerado em</div>
              <div className="font-semibold text-slate-800 text-[13px]">{formattedDate}</div>
            </div>
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-100 print:border-none print:bg-transparent print:p-0">
              <div className="uppercase tracking-wider text-[9px] font-bold text-slate-400 mb-0.5">Total de Credores</div>
              <div className="font-semibold text-slate-800 text-[13px]">{kpis.count} registros</div>
            </div>
          </div>
        </div>

        {/* KPI Section - Premium Dashboard Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 print-break-avoid">
          <div className="relative overflow-hidden border border-slate-200 rounded-lg p-5 bg-gradient-to-b from-white to-slate-50 shadow-sm print:shadow-none print:border-slate-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-azul-profundo"></div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Voto Confirmado
            </div>
            <div className="text-[22px] font-extrabold text-slate-900 tabular-nums leading-none mb-1.5">
              {formatRjCurrency(kpis.votoConf)}
            </div>
            {representatividade.confPct !== null && (
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                {representatividade.confPct.toFixed(1)}% do Passivo Geral
              </div>
            )}
          </div>

          <div className="relative overflow-hidden border border-slate-200 rounded-lg p-5 bg-gradient-to-b from-white to-slate-50 shadow-sm print:shadow-none print:border-slate-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Voto Sujeito (Total)
            </div>
            <div className="text-[22px] font-extrabold text-slate-900 tabular-nums leading-none mb-1.5">
              {formatRjCurrency(kpis.votoTotal)}
            </div>
            {representatividade.confPct !== null && representatividade.pendPct !== null && (
              <div className="text-[11px] font-medium text-slate-500">
                {((kpis.votoTotal / config.passivo) * 100).toFixed(1)}% do Passivo Geral
              </div>
            )}
          </div>

          <div className="relative overflow-hidden border border-slate-200 rounded-lg p-5 bg-gradient-to-b from-white to-slate-50 shadow-sm print:shadow-none print:border-slate-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Fora da RJ
            </div>
            <div className="text-[22px] font-extrabold text-slate-900 tabular-nums leading-none mb-1.5">
              {formatRjCurrency(kpis.foraTotal)}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              {kpis.foraCount} credor(es) sem voto
            </div>
          </div>

          <div className="relative overflow-hidden border border-slate-200 rounded-lg p-5 bg-slate-900 text-white shadow-sm print:shadow-none print:bg-slate-100 print:text-slate-900 print:border-slate-300">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:text-slate-500">
              Passivo Declarado
            </div>
            <div className="text-[22px] font-extrabold tabular-nums leading-none mb-1.5">
              {config.passivo ? formatRjCurrency(config.passivo) : "—"}
            </div>
            <div className="text-[11px] font-medium text-slate-400 print:text-slate-500">
              Valor de Referência Oficial
            </div>
          </div>
        </div>

        {/* Class Breakdown Section */}
        <div className="mb-10 print-break-avoid">
          <h2 className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-3">
            <span className="w-4 h-px bg-slate-300"></span>
            Resumo Analítico por Classe
            <span className="flex-1 h-px bg-slate-100 print:bg-slate-200"></span>
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-slate-300">
            <table className="w-full text-left text-[12px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 print:bg-slate-100">
                  <th className="py-3 px-4 w-[40%]">Classe Estrutural</th>
                  <th className="py-3 px-4 text-center">Quantidade</th>
                  <th className="py-3 px-4 text-right">Valor Consolidado</th>
                  <th className="py-3 px-4 text-right">Participação (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">Classe I — Trabalhista</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-600">{classes.I.count}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{formatRjCurrency(classes.I.valor)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-600">
                    {kpis.votoTotal ? `${((classes.I.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">Classe II — Garantia Real</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-600">{classes.II.count}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{formatRjCurrency(classes.II.valor)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-600">
                    {kpis.votoTotal ? `${((classes.II.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">Classe III — Quirografário</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-600">{classes.III.count}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{formatRjCurrency(classes.III.valor)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-600">
                    {kpis.votoTotal ? `${((classes.III.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">Classe IV — ME / EPP</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-600">{classes.IV.count}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{formatRjCurrency(classes.IV.valor)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-600">
                    {kpis.votoTotal ? `${((classes.IV.valor / kpis.votoTotal) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
                <tr className="bg-slate-50/80 print:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-500 italic">Fora da RJ (Sem direito a voto)</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-500">{classes.fora.count}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-500">{formatRjCurrency(classes.fora.valor)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Creditors Section */}
        <div>
          <h2 className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-3">
            <span className="w-4 h-px bg-slate-300"></span>
            Detalhamento de Credores
            <span className="flex-1 h-px bg-slate-100 print:bg-slate-200"></span>
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-slate-300">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px] print:bg-slate-100 print:text-slate-800 print:border-b print:border-slate-300">
                  <th className="py-3 px-3 w-[25%]">Nome do Credor</th>
                  <th className="py-3 px-3">Enquadramento</th>
                  <th className="py-3 px-3 text-right">Valor R$</th>
                  <th className="py-3 px-3">Status Interno</th>
                  <th className="py-3 px-3">Próxima Ação</th>
                  <th className="py-3 px-3">Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {credores.map((c: RjCredor) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors print:hover:bg-transparent"
                  >
                    <td className="py-3 px-3 font-bold text-slate-800">
                      <div className="line-clamp-2 leading-tight">
                        {c.nome}
                      </div>
                      {!c.sujeito && (
                        <span className="inline-block mt-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                          Não Vota
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-medium text-slate-700">
                        {c.sujeito ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-azul-profundo print:bg-slate-500"></span>
                            Classe {c.classe}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {c.motivo ? RJ_MOTIVO_LABELS[c.motivo as keyof typeof RJ_MOTIVO_LABELS] : "Outro"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right align-top font-bold tabular-nums text-slate-900">
                      {c.valor ? formatRjCurrency(c.valor) : <span className="text-slate-400 font-normal italic">A definir</span>}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-inset ring-slate-200/50 print:bg-transparent print:ring-0 print:p-0 print:text-[11px]">
                        {RJ_STATUS_LABELS[c.status as keyof typeof RJ_STATUS_LABELS] ?? c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="text-slate-700 font-medium line-clamp-2 text-[10px] leading-relaxed">
                        {c.passo || <span className="text-slate-400 italic font-normal">Nenhum registro</span>}
                      </div>
                      {c.retorno && (
                        <div className="mt-1 text-[9px] font-bold text-azul-profundo uppercase tracking-wider print:text-slate-600">
                          Retorno: {c.retorno.split("-").reverse().slice(0, 2).join("/")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-slate-600 text-[10px] leading-relaxed break-all">
                      {c.contato || <span className="text-slate-400 italic">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Report Footer */}
        <div className="mt-16 pt-6 border-t-2 border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 print:border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            CAIS Investimentos · Relatório Gerencial
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Uso Interno Exclusivo · Confidencial
          </div>
        </div>
      </div>
    </div>
  );
}
