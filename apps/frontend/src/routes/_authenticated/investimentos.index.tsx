import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { KPICard } from "@/components/cais/KPICard";
import { Input } from "@/components/ui/input";
import { InvestFunnel } from "@/components/cais/invest/InvestFunnel";
import { usePermissions } from "@/lib/use-permissions";
import {
  fetchInvestLeads,
  formatBRLCompact,
  investPipeByResponsavel,
  investTotals,
  updateInvestConfig,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/")({
  head: () => ({ meta: [{ title: "Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) => {
    const perms = (context as { permissions?: string[] }).permissions ?? [];
    // Sem acesso ao módulo de investimento → vai para o consórcio.
    if (!perms.includes("investimentos.view")) throw redirect({ to: "/dashboard" });
    if (perms.includes("investimentos.manage")) return; // gestor/admin fica no dashboard
    // SDR (agenda) cai na fila de trabalho.
    if (perms.includes("investimentos.schedule")) {
      throw redirect({ to: "/investimentos/sdr" });
    }
    // Qualificador cai na fila de qualificação.
    if (perms.includes("investimentos.qualify")) {
      throw redirect({ to: "/investimentos/qualificacao" });
    }
    // Assessor (edita, sem agendar nem qualificar) cai nas suas reuniões.
    if (perms.includes("investimentos.edit")) {
      throw redirect({ to: "/investimentos/reunioes" });
    }
  },
  component: InvestDashboardPage,
});

function InvestDashboardPage() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const queryClient = useQueryClient();

  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });
  const leads = useMemo(() => data.data?.leads ?? [], [data.data]);
  const meta = data.data?.config.meta ?? 0;

  const totals = useMemo(() => investTotals(leads), [leads]);
  const porResponsavel = useMemo(() => investPipeByResponsavel(leads), [leads]);
  const closed = totals.ganhoN + totals.perdidoN;
  const conversao = closed ? Math.round((totals.ganhoN / closed) * 100) : null;

  const [metaDraft, setMetaDraft] = useState<string | null>(null);
  const metaMutation = useMutation({
    mutationFn: (value: number) => updateInvestConfig(value),
    onSuccess: () => {
      setMetaDraft(null);
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
      toast.success("Meta de captação atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMeta = () => {
    if (metaDraft === null) return;
    const cleaned = metaDraft.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const value = parseFloat(cleaned);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Valor de meta inválido");
      return;
    }
    metaMutation.mutate(value);
  };

  const confPct = meta ? Math.min((totals.ganhoVal / meta) * 100, 100) : 0;
  const pendPct = meta ? Math.min((totals.prevOpen / meta) * 100, 100 - confPct) : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-azul-profundo">Dashboard · Investimentos</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Campanha BNF — Build a New Future · visão de pipe e captação
            </p>
          </div>
          <Link
            to="/investimentos/pipeline"
            className="inline-flex items-center gap-2 rounded-md bg-azul-profundo px-4 py-2.5 text-sm font-medium text-branco transition-colors hover:bg-azul-marinho"
          >
            Abrir pipeline <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label="Leads no pipeline"
            value={totals.ativosN}
            sub={`${totals.ganhoN} ganhos · ${totals.perdidoN} perdidos`}
          />
          <KPICard
            label="Clientes ganhos"
            value={totals.ganhoN}
            sub={conversao !== null ? `${conversao}% de conversão` : "—"}
            valueClassName="text-emerald-700"
          />
          <KPICard
            label="PL no pipeline"
            value={formatBRLCompact(totals.plOpen)}
            sub="potencial de captação"
            valueClassName="text-ouro-escuro"
          />
          <KPICard
            label="Previsão ponderada"
            value={formatBRLCompact(totals.prevTotal)}
            sub="PL × probabilidade (por lead)"
            valueClassName="text-ouro-escuro"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-md border border-slate-200 bg-branco p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-ouro-escuro">
              Meta de captação (BNF)
            </h3>
            <div className="mb-3 flex items-center gap-2">
              <Input
                inputMode="numeric"
                className="max-w-56 tabular-nums"
                placeholder="ex.: 50.000.000"
                disabled={!canManage}
                value={metaDraft ?? (meta ? meta.toLocaleString("pt-BR") : "")}
                onChange={(e) => setMetaDraft(e.target.value)}
                onBlur={() => metaDraft !== null && saveMeta()}
                onKeyDown={(e) => e.key === "Enter" && saveMeta()}
              />
              <span className="text-xs text-slate-500">Meta de captação / AUC (R$)</span>
            </div>
            <div className="flex h-7 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${confPct}%` }} />
              <div
                className="h-full transition-all"
                style={{
                  width: `${pendPct}%`,
                  background:
                    "repeating-linear-gradient(45deg,#b89c5e,#b89c5e 6px,#d9bd7e 6px,#d9bd7e 12px)",
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                <i className="mr-1.5 inline-block h-2 w-2 rounded-[2px] bg-emerald-600" />
                Captado (ganho){" "}
                <strong className="tabular-nums text-emerald-700">
                  {meta ? `${confPct.toFixed(1)}%` : "—"}
                </strong>
              </span>
              <span>
                <i className="mr-1.5 inline-block h-2 w-2 rounded-[2px] bg-ouro" />
                Previsão do funil{" "}
                <strong className="tabular-nums text-ouro-escuro">
                  {meta ? `${pendPct.toFixed(1)}%` : "—"}
                </strong>
              </span>
              <span>
                <i className="mr-1.5 inline-block h-2 w-2 rounded-[2px] border border-slate-300 bg-slate-100" />
                Falta p/ meta
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-branco p-4">
            <h3 className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.6px] text-ouro-escuro">
              Funil por etapa
              <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
                nº · PL
              </span>
            </h3>
            <InvestFunnel leads={leads} />
          </div>
        </div>

        <div className="mt-3 rounded-md border border-slate-200 bg-branco p-4">
          <h3 className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.6px] text-ouro-escuro">
            Pipe por responsável
            <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
              total · ponderado
            </span>
          </h3>
          {porResponsavel.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhum lead ativo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10.5px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Responsável</th>
                    <th className="py-2 pr-4 text-right font-semibold">Leads</th>
                    <th className="py-2 pr-4 text-right font-semibold">Pipe total</th>
                    <th className="py-2 text-right font-semibold">Ponderado</th>
                  </tr>
                </thead>
                <tbody>
                  {porResponsavel.map((r) => (
                    <tr key={r.nome} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-2 pr-4 font-medium text-azul-profundo">{r.nome}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{r.count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                        {formatBRLCompact(r.total)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-semibold text-ouro-escuro">
                        {formatBRLCompact(r.ponderado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
