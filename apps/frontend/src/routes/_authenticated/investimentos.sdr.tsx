import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutDashboard, Phone } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { InvestLeadDialog } from "@/components/cais/invest/InvestLeadDialog";
import { InvestReuniaoDialog } from "@/components/cais/invest/InvestReuniaoDialog";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { fetchProfiles } from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";
import {
  INVEST_ETAPA_INFO,
  INVEST_SDR_BUCKETS,
  fetchInvestLeads,
  formatBRL,
  formatInvestRetorno,
  investRetornoSoon,
  investSdrBucket,
  type InvestLead,
  type SdrBucket,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/sdr")({
  head: () => ({ meta: [{ title: "Fila SDR · Investimentos — CAIS" }] }),
  component: InvestSdrPage,
});

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function InvestSdrPage() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const canEdit = canManage || can("investimentos.edit");
  const canCreate = canManage || can("investimentos.create");
  const canSchedule = canManage || can("investimentos.schedule");

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });
  const leads = useMemo(() => data.data?.leads ?? [], [data.data]);

  const [editingLead, setEditingLead] = useState<InvestLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reuniaoLead, setReuniaoLead] = useState<InvestLead | null>(null);
  const [reuniaoOpen, setReuniaoOpen] = useState(false);

  const openReuniao = (l: InvestLead) => {
    setReuniaoLead(l);
    setReuniaoOpen(true);
  };

  const today = todayISO();
  const buckets = useMemo(() => {
    const map: Record<SdrBucket, InvestLead[]> = { ligar: [], retornos: [], fechar: [], ativas: [] };
    for (const l of leads) {
      const b = investSdrBucket(l, today);
      if (b) map[b].push(l);
    }
    // ordena cada bucket por PL desc
    for (const k of Object.keys(map) as SdrBucket[]) map[k].sort((a, b) => b.pl - a.pl);
    return map;
  }, [leads, today]);

  const openLead = (l: InvestLead) => {
    setEditingLead(l);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <Phone className="h-5 w-5 text-ouro-escuro" /> Fila de trabalho — SDR
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Sua fila do dia, agrupada por ação · campanha BNF
            </p>
          </div>
          <Link
            to="/investimentos"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </div>

        {data.isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando fila...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {INVEST_SDR_BUCKETS.map((bucket) => {
              const items = buckets[bucket.key];
              return (
                <div
                  key={bucket.key}
                  className="flex flex-col rounded-md border border-slate-200 bg-slate-50/70"
                >
                  <div className="border-b border-slate-200 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-azul-profundo">
                      <span className="h-2 w-2 rounded-[2px]" style={{ background: bucket.color }} />
                      {bucket.label}
                      <span className="ml-auto text-[11px] tabular-nums text-slate-500">
                        {items.length}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{bucket.hint}</div>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-2 p-2">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 px-2 py-4 text-center text-[11px] text-slate-400">
                        Nada aqui
                      </div>
                    ) : (
                      items.map((l) => {
                        const info = INVEST_ETAPA_INFO[l.etapa];
                        return (
                          <div
                            key={l.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openLead(l)}
                            className="cursor-pointer rounded-md border border-slate-200 bg-branco p-2.5 text-left shadow-sm transition-colors hover:border-slate-300"
                            style={{ borderLeftWidth: 3, borderLeftColor: bucket.color }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] font-semibold leading-tight text-azul-profundo">
                                {l.nome}
                              </span>
                              <InvestFaixaTag faixa={l.faixa} />
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold tabular-nums text-ouro-escuro">
                                {l.pl ? formatBRL(l.pl) : "PL a definir"}
                              </span>
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  color: info.color,
                                  backgroundColor: info.bg,
                                  borderColor: info.color,
                                }}
                              >
                                {info.label}
                              </span>
                            </div>
                            {l.passo && (
                              <div className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                                {l.passo}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between">
                              {l.responsavel_nome ? (
                                <span className="rounded border border-sky-100 bg-sky-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-azul-corporativo">
                                  {l.responsavel_nome}
                                </span>
                              ) : (
                                <span />
                              )}
                              {l.retorno && (
                                <span
                                  className={cn(
                                    "text-[10px] tabular-nums",
                                    investRetornoSoon(l.retorno)
                                      ? "font-semibold text-ouro-escuro"
                                      : "text-slate-400",
                                  )}
                                >
                                  {formatInvestRetorno(l.retorno)}
                                </span>
                              )}
                            </div>
                            {canSchedule && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReuniao(l);
                                }}
                                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-slate-200 py-1 text-[11px] font-medium text-azul-corporativo transition-colors hover:border-ouro hover:bg-ouro/10"
                              >
                                <CalendarClock className="h-3.5 w-3.5" /> Marcar reunião
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InvestLeadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lead={editingLead}
        profiles={profiles.data ?? []}
        canManage={canManage}
        canCreate={canCreate}
        canEdit={canEdit}
      />
      <InvestReuniaoDialog
        open={reuniaoOpen}
        onClose={() => setReuniaoOpen(false)}
        lead={reuniaoLead}
      />
    </AppLayout>
  );
}
