import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutDashboard, MapPin, List as ListIcon, Calendar as CalendarIcon, Users, User, Link as LinkIcon, Loader2, Video } from "lucide-react";
import type { View } from "react-big-calendar";
import { AppLayout } from "@/components/cais/AppLayout";
import { InvestLeadDialog } from "@/components/cais/invest/InvestLeadDialog";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { InvestAgendaCalendar } from "@/components/cais/invest/InvestAgendaCalendar";
import { fetchProfiles } from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import {
  fetchInvestLeads,
  fetchInvestReunioes,
  fetchOutlookAuthUrl,
  type InvestLead,
  type InvestReuniao,
} from "@/lib/invest-api";
import { toast } from "sonner";

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
  const leads = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const reunioes = useQuery({
    queryKey: ["invest-reunioes", scope],
    queryFn: () => fetchInvestReunioes({ scope }),
  });

  const [editingLead, setEditingLead] = useState<InvestLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectingOutlook, setConnectingOutlook] = useState(false);

  const handleConnectOutlook = async () => {
    try {
      setConnectingOutlook(true);
      const url = await fetchOutlookAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Falha ao conectar com Outlook");
      setConnectingOutlook(false);
    }
  };

  useMemo(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("outlook") === "connected") {
        setTimeout(() => toast.success("Outlook conectado com sucesso!"), 500);
        // Clear search params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

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

  const renderReuniao = (r: InvestReuniao) => {
    const urlMatch = r.local?.match(/(https?:\/\/[^\s]+)/);
    const meetingUrl = urlMatch ? urlMatch[1] : null;
    const cleanLocal = r.local ? r.local.replace(meetingUrl || "", "").replace(/\s*-\s*$/, "").trim() : "";

    return (
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
      <div className="mt-1 flex items-center justify-between gap-2">
        {cleanLocal ? (
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" /> {cleanLocal}
          </div>
        ) : <div />}
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded bg-[#5B5FC7] px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#464A9E]"
          >
            <Video className="h-3 w-3" /> Entrar no Teams
          </a>
        )}
      </div>
    </button>
    );
  };

  return (
    <AppLayout>
      <div className={viewMode === "calendar" ? "mx-auto max-w-[1240px]" : "mx-auto max-w-[900px]"}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <CalendarClock className="h-5 w-5 text-ouro-escuro" /> 
              {scope === "mine" ? "Minhas reuniões" : "Todas as reuniões"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {scope === "mine" ? "Reuniões marcadas para você" : "Agenda de reuniões de todo o time"} · campanha BNF
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleConnectOutlook}
              disabled={connectingOutlook}
              className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
            >
              {connectingOutlook ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Conectar Outlook
            </button>
            <Link
              to="/investimentos"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            {canManage && (
              <div className="inline-flex rounded-md border border-slate-200 bg-branco p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setScope("mine")}
                  className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    scope === "mine" ? "bg-azul-profundo text-branco" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <User className="h-4 w-4" /> Minhas
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    scope === "all" ? "bg-azul-profundo text-branco" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Users className="h-4 w-4" /> Todas
                </button>
              </div>
            )}
            
            <div className="inline-flex rounded-md border border-slate-200 bg-branco p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "list" ? "bg-azul-profundo text-branco" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ListIcon className="h-4 w-4" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "calendar" ? "bg-azul-profundo text-branco" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CalendarIcon className="h-4 w-4" /> Calendário
              </button>
            </div>
          </div>
        </div>

        {reunioes.isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando reuniões...
          </div>
        ) : viewMode === "calendar" ? (
          <InvestAgendaCalendar
            reunioes={reunioes.data ?? []}
            view={calendarView}
            date={calendarDate}
            onView={setCalendarView}
            onNavigate={setCalendarDate}
            onSelectEvent={(r) => openLeadFicha(r.lead.id)}
          />
        ) : (reunioes.data ?? []).length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
            <p className="text-sm font-semibold text-slate-600">Nenhuma reunião marcada</p>
            <p className="mt-1 text-xs text-slate-400">
              {scope === "mine" ? "Quando o SDR marcar uma reunião com você, ela aparece aqui." : "Não há reuniões marcadas."}
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
