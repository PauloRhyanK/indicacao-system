import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutDashboard, MapPin } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { InvestLeadDialog } from "@/components/cais/invest/InvestLeadDialog";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { fetchProfiles } from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import {
  fetchInvestLeads,
  fetchInvestReunioes,
  type InvestLead,
  type InvestReuniao,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/reunioes")({
  head: () => ({ meta: [{ title: "Minhas reuniões · Investimentos — CAIS" }] }),
  component: InvestReunioesPage,
});

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InvestReunioesPage() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const canEdit = canManage || can("investimentos.edit");
  const canCreate = canManage || can("investimentos.create");

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const reunioes = useQuery({
    queryKey: ["invest-reunioes", "mine"],
    queryFn: () => fetchInvestReunioes({ scope: "mine" }),
  });
  const leads = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });

  const [editingLead, setEditingLead] = useState<InvestLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const now = Date.now();
  const { futuras, passadas } = useMemo(() => {
    const all = reunioes.data ?? [];
    return {
      futuras: all.filter((r) => new Date(r.data_hora_inicio).getTime() >= now),
      passadas: all
        .filter((r) => new Date(r.data_hora_inicio).getTime() < now)
        .reverse(),
    };
  }, [reunioes.data, now]);

  const openLeadFicha = (leadId: string) => {
    const full = (leads.data?.leads ?? []).find((l) => l.id === leadId);
    if (full) {
      setEditingLead(full);
      setDialogOpen(true);
    }
  };

  const renderReuniao = (r: InvestReuniao) => (
    <button
      key={r.id}
      type="button"
      onClick={() => openLeadFicha(r.lead.id)}
      className="w-full rounded-md border border-slate-200 bg-branco p-3 text-left shadow-sm transition-colors hover:border-ouro"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-ouro-escuro" />
          <span className="text-[13px] font-semibold tabular-nums text-azul-profundo">
            {formatDataHora(r.data_hora_inicio)}
          </span>
        </div>
        <InvestFaixaTag faixa={r.lead.faixa} />
      </div>
      <div className="mt-1.5 text-[14px] font-semibold text-azul-profundo">{r.lead.nome}</div>
      {r.lead.pitch && (
        <div className="mt-1 line-clamp-2 text-[12px] text-slate-500">{r.lead.pitch}</div>
      )}
      {r.local && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="h-3 w-3" /> {r.local}
        </div>
      )}
    </button>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <CalendarClock className="h-5 w-5 text-ouro-escuro" /> Minhas reuniões
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Reuniões marcadas para você · campanha BNF
            </p>
          </div>
          <Link
            to="/investimentos"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </div>

        {reunioes.isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando reuniões...
          </div>
        ) : (reunioes.data ?? []).length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
            <p className="text-sm font-semibold text-slate-600">Nenhuma reunião marcada</p>
            <p className="mt-1 text-xs text-slate-400">
              Quando o SDR marcar uma reunião com você, ela aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-ouro-escuro">
                Próximas ({futuras.length})
              </h2>
              <div className="space-y-2">
                {futuras.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma reunião futura.</p>
                ) : (
                  futuras.map(renderReuniao)
                )}
              </div>
            </section>

            {passadas.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-slate-400">
                  Anteriores ({passadas.length})
                </h2>
                <div className="space-y-2 opacity-70">{passadas.map(renderReuniao)}</div>
              </section>
            )}
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
    </AppLayout>
  );
}
