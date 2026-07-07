import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Kanban, LayoutDashboard, List, Plus, Printer, Search, Upload } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestLeadDialog } from "@/components/cais/invest/InvestLeadDialog";
import { InvestImportDialog } from "@/components/cais/invest/InvestImportDialog";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { InvestLeadsGrid } from "@/components/cais/invest/InvestLeadsGrid";
import { fetchProfiles } from "@/lib/cais-api";
import { fetchMe } from "@/lib/api/auth";
import { usePermissions } from "@/lib/use-permissions";
import { requireInvestPerm } from "@/lib/invest-guards";
import { cn } from "@/lib/utils";
import {
  INVEST_ETAPAS,
  INVEST_ETAPA_INFO,
  downloadInvestCsv,
  fetchInvestLeads,
  formatBRL,
  formatBRLCompact,
  formatInvestRetorno,
  investRetornoSoon,
  investWeighted,
  updateInvestLeadEtapa,
  type InvestEtapa,
  type InvestLead,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) => requireInvestPerm(context, ["investimentos.view"]),
  component: InvestPipelinePage,
});

type Recorte = "todos" | "meus" | "sem-responsavel";
type ViewMode = "lista" | "kanban";

function InvestPipelinePage() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const canEdit = canManage || can("investimentos.edit");
  const canCreate = canManage || can("investimentos.create");
  const canImport = can("investimentos.import");

  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });

  const leads = useMemo(() => data.data?.leads ?? [], [data.data]);
  const currentUserId = me.data?.user.id;

  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "lista";
    return (localStorage.getItem("cais-invest-view") as ViewMode) || "lista";
  });
  const [recorte, setRecorte] = useState<Recorte>("todos");
  const [etapaFilter, setEtapaFilter] = useState<"all" | InvestEtapa>("all");
  const [respFilter, setRespFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<InvestLead | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const setViewMode = (v: ViewMode) => {
    setView(v);
    localStorage.setItem("cais-invest-view", v);
  };

  const openCreate = () => {
    setEditingLead(null);
    setLeadDialogOpen(true);
  };
  const openEdit = (lead: InvestLead) => {
    setEditingLead(lead);
    setLeadDialogOpen(true);
  };

  const responsaveis = useMemo(() => {
    const names = new Set<string>();
    for (const l of leads) if (l.responsavel_nome) names.add(l.responsavel_nome);
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (recorte === "meus" && l.responsavel?.id !== currentUserId) return false;
      if (recorte === "sem-responsavel" && l.responsavel_nome) return false;
      if (respFilter !== "all" && l.responsavel_nome !== respFilter) return false;
      if (
        q &&
        ![l.nome, l.passo, l.contato, l.responsavel_nome, l.pitch, l.obs].some((v) =>
          v.toLowerCase().includes(q),
        )
      )
        return false;
      return true;
    });
  }, [leads, recorte, respFilter, search, currentUserId]);

  const etapaMutation = useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: InvestEtapa }) =>
      updateInvestLeadEtapa(id, etapa),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invest-leads"] }),
    onError: (err: Error) => {
      toast.error(err.message);
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
    },
  });

  const dragId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<InvestEtapa | null>(null);

  const handleDrop = (etapa: InvestEtapa) => {
    const id = dragId.current;
    dragId.current = null;
    setDragOverCol(null);
    if (!id || !canEdit) return;
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.etapa !== etapa) etapaMutation.mutate({ id, etapa });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-azul-profundo">Pipeline de Investimentos</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Captação de clientes · campanha BNF — Build a New Future
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/investimentos"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Button variant="ghost" onClick={() => void downloadInvestCsv()}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Link
              to="/investimentos/imprimir"
              search={respFilter !== "all" ? { responsavel: respFilter } : {}}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Link>
            {canImport && (
              <Button variant="ghost" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Importar
              </Button>
            )}
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Cadastrar lead
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={recorte} onValueChange={(v) => setRecorte(v as Recorte)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="meus">Meus leads</TabsTrigger>
              <TabsTrigger value="sem-responsavel">Sem responsável</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={respFilter} onValueChange={setRespFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {responsaveis.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="w-[190px] pl-8"
                placeholder="Buscar lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="inline-flex rounded-md border border-slate-200 bg-branco p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                  view === "lista"
                    ? "bg-azul-profundo text-branco"
                    : "text-slate-500 hover:text-azul-profundo",
                )}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                  view === "kanban"
                    ? "bg-azul-profundo text-branco"
                    : "text-slate-500 hover:text-azul-profundo",
                )}
              >
                <Kanban className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>
          </div>
        </div>

        {view === "lista" && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <EtapaChip
              active={etapaFilter === "all"}
              label="Todos"
              count={filtered.length}
              onClick={() => setEtapaFilter("all")}
            />
            {INVEST_ETAPAS.map((e) => (
              <EtapaChip
                key={e}
                active={etapaFilter === e}
                label={INVEST_ETAPA_INFO[e].label}
                count={filtered.filter((l) => l.etapa === e).length}
                color={INVEST_ETAPA_INFO[e].color}
                bg={INVEST_ETAPA_INFO[e].bg}
                onClick={() => setEtapaFilter(e)}
              />
            ))}
          </div>
        )}

        {data.isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando pipeline...
          </div>
        ) : view === "lista" ? (
          <InvestLeadsGrid
            recorte={recorte}
            respFilter={respFilter}
            etapaFilter={etapaFilter}
            search={search}
            canEdit={canEdit}
            onEdit={openEdit}
            onEtapa={(id, etapa) => etapaMutation.mutate({ id, etapa })}
          />
        ) : (
          <div className="flex h-[calc(100vh-320px)] gap-3 overflow-x-auto pb-3 md:h-[calc(100vh-260px)]">
            {INVEST_ETAPAS.map((etapa) => {
              const info = INVEST_ETAPA_INFO[etapa];
              const cards = filtered.filter((l) => l.etapa === etapa).sort((a, b) => b.pl - a.pl);
              const sumPl = cards.reduce((s, l) => s + l.pl, 0);
              return (
                <div
                  key={etapa}
                  className={cn(
                    "flex h-full max-h-full w-[250px] flex-none flex-col overflow-hidden rounded-md border bg-slate-50/70",
                    dragOverCol === etapa ? "border-ouro bg-branco" : "border-slate-200",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(etapa);
                  }}
                  onDragLeave={() => setDragOverCol((c) => (c === etapa ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(etapa);
                  }}
                >
                  <div className="shrink-0 border-b border-slate-200 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-azul-profundo">
                      <span className="h-2 w-2 rounded-[2px]" style={{ background: info.color }} />
                      {info.label}
                    </div>
                    <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                      {cards.length} lead{cards.length === 1 ? "" : "s"} · {formatBRLCompact(sumPl)}
                    </div>
                  </div>
                  <div className="flex min-h-[72px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {cards.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 px-2 py-4 text-center text-[11px] text-slate-400">
                        Solte um card aqui
                      </div>
                    ) : (
                      cards.map((l) => (
                        <div
                          key={l.id}
                          draggable={canEdit}
                          onDragStart={() => (dragId.current = l.id)}
                          onClick={() => openEdit(l)}
                          className="cursor-pointer rounded-md border border-slate-200 bg-branco p-2.5 shadow-sm transition-colors hover:border-slate-300"
                          style={{ borderLeftWidth: 3, borderLeftColor: info.color }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[13px] font-semibold leading-tight text-azul-profundo">
                              {l.nome}
                            </div>
                            <InvestFaixaTag faixa={l.faixa} />
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-semibold tabular-nums text-ouro-escuro">
                              {l.pl ? formatBRL(l.pl) : "PL a definir"}
                              {l.abaixo_do_piso && (
                                <span title="Abaixo de R$ 1 mi" className="ml-1 text-amber-500">
                                  ⚠
                                </span>
                              )}
                            </span>
                            {etapa !== "ganho" && etapa !== "perdido" && (
                              <span className="text-[10px] text-slate-400">{l.probabilidade}%</span>
                            )}
                          </div>
                          {l.pl > 0 && etapa !== "ganho" && etapa !== "perdido" && (
                            <div className="text-[10px] text-slate-400">
                              previsão → {formatBRLCompact(investWeighted(l))}
                            </div>
                          )}
                          {l.passo && (
                            <div className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                              {l.passo}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
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
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InvestLeadDialog
        open={leadDialogOpen}
        onClose={() => setLeadDialogOpen(false)}
        lead={editingLead}
        profiles={profiles.data ?? []}
        canManage={canManage}
        canCreate={canCreate}
        canEdit={canEdit}
      />
      <InvestImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </AppLayout>
  );
}

function EtapaChip({
  active,
  label,
  count,
  color,
  bg,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color?: string;
  bg?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-current font-semibold"
          : "border-slate-200 bg-branco text-slate-500 hover:border-ouro",
      )}
      style={
        active && color
          ? { color, backgroundColor: bg }
          : active
            ? { color: "#081421", backgroundColor: "#eef1f4" }
            : undefined
      }
    >
      {label}
      <span className="text-[11px] font-semibold tabular-nums">{count}</span>
    </button>
  );
}
