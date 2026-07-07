import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutDashboard, Phone, Search } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { InvestLeadDialog } from "@/components/cais/invest/InvestLeadDialog";
import { InvestReuniaoDialog } from "@/components/cais/invest/InvestReuniaoDialog";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProfiles } from "@/lib/cais-api";
import { fetchMe } from "@/lib/api/auth";
import { usePermissions } from "@/lib/use-permissions";
import { requireInvestPerm } from "@/lib/invest-guards";
import { cn } from "@/lib/utils";
import {
  INVEST_ETAPA_INFO,
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  INVEST_SDR_BUCKETS,
  fetchInvestLeads,
  formatBRL,
  formatInvestRetorno,
  investRetornoSoon,
  investSdrBucket,
  type InvestEtapa,
  type InvestFaixa,
  type InvestLead,
  type SdrBucket,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/sdr")({
  head: () => ({ meta: [{ title: "Fila SDR · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) =>
    requireInvestPerm(context, ["investimentos.edit", "investimentos.manage"]),
  component: InvestSdrPage,
});

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

type SdrRecorte = "meus" | "todos";
type SdrSortBy = "pl" | "nome" | "retorno" | "updated";

const SORT_OPTIONS: { value: SdrSortBy; label: string }[] = [
  { value: "pl", label: "PL (maior primeiro)" },
  { value: "retorno", label: "Retorno (mais próximo)" },
  { value: "nome", label: "Nome (A-Z)" },
  { value: "updated", label: "Atualizado (recente)" },
];

// Etapas possíveis dentro do catch-all "ativas" (exclui negociação/ganho/perdido, que têm bucket próprio).
const ATIVAS_ETAPA_ORDER: InvestEtapa[] = ["lead", "qualificado", "contato", "reuniao", "proposta"];

function sortLeads(a: InvestLead, b: InvestLead, sortBy: SdrSortBy): number {
  switch (sortBy) {
    case "nome":
      return a.nome.localeCompare(b.nome, "pt-BR");
    case "retorno":
      if (!a.retorno && !b.retorno) return 0;
      if (!a.retorno) return 1;
      if (!b.retorno) return -1;
      return a.retorno.localeCompare(b.retorno);
    case "updated":
      return b.updated_at.localeCompare(a.updated_at);
    case "pl":
    default:
      return b.pl - a.pl;
  }
}

function groupByEtapa(items: InvestLead[]): { etapa: InvestEtapa; items: InvestLead[] }[] {
  return ATIVAS_ETAPA_ORDER.map((etapa) => ({
    etapa,
    items: items.filter((l) => l.etapa === etapa),
  })).filter((g) => g.items.length > 0);
}

function InvestSdrPage() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const canEdit = canManage || can("investimentos.edit");
  const canCreate = canManage || can("investimentos.create");
  const canSchedule = canManage || can("investimentos.schedule");

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });
  const leads = useMemo(() => data.data?.leads ?? [], [data.data]);
  const currentUserId = me.data?.user.id;

  const [recorte, setRecorte] = useState<SdrRecorte>(() => {
    if (typeof window === "undefined") return "meus";
    return (localStorage.getItem("cais-invest-sdr-recorte") as SdrRecorte) || "meus";
  });
  const [sortBy, setSortBy] = useState<SdrSortBy>(() => {
    if (typeof window === "undefined") return "pl";
    return (localStorage.getItem("cais-invest-sdr-sort") as SdrSortBy) || "pl";
  });
  const [respFilter, setRespFilter] = useState<string>("all");
  const [faixaFilter, setFaixaFilter] = useState<"all" | InvestFaixa>("all");
  const [search, setSearch] = useState("");

  const setRecorteMode = (v: SdrRecorte) => {
    setRecorte(v);
    localStorage.setItem("cais-invest-sdr-recorte", v);
  };
  const setSortMode = (v: SdrSortBy) => {
    setSortBy(v);
    localStorage.setItem("cais-invest-sdr-sort", v);
  };

  const [editingLead, setEditingLead] = useState<InvestLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reuniaoLead, setReuniaoLead] = useState<InvestLead | null>(null);
  const [reuniaoOpen, setReuniaoOpen] = useState(false);

  const openReuniao = (l: InvestLead) => {
    setReuniaoLead(l);
    setReuniaoOpen(true);
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
      if (respFilter !== "all" && l.responsavel_nome !== respFilter) return false;
      if (faixaFilter !== "all" && l.faixa !== faixaFilter) return false;
      if (
        q &&
        ![l.nome, l.passo, l.contato, l.responsavel_nome, l.pitch, l.obs].some((v) =>
          v.toLowerCase().includes(q),
        )
      )
        return false;
      return true;
    });
  }, [leads, recorte, respFilter, faixaFilter, search, currentUserId]);

  const today = todayISO();
  const buckets = useMemo(() => {
    const map: Record<SdrBucket, InvestLead[]> = { ligar: [], retornos: [], fechar: [], ativas: [] };
    for (const l of filtered) {
      const b = investSdrBucket(l, today);
      if (b) map[b].push(l);
    }
    for (const k of Object.keys(map) as SdrBucket[]) map[k].sort((a, b) => sortLeads(a, b, sortBy));
    return map;
  }, [filtered, today, sortBy]);

  const openLead = (l: InvestLead) => {
    setEditingLead(l);
    setDialogOpen(true);
  };

  const renderCard = (l: InvestLead, color: string) => {
    const info = INVEST_ETAPA_INFO[l.etapa];
    return (
      <div
        key={l.id}
        role="button"
        tabIndex={0}
        onClick={() => openLead(l)}
        className="cursor-pointer rounded-md border border-slate-200 bg-branco p-2.5 text-left shadow-sm transition-colors hover:border-slate-300"
        style={{ borderLeftWidth: 3, borderLeftColor: color }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold leading-tight text-azul-profundo">{l.nome}</span>
          <InvestFaixaTag faixa={l.faixa} />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold tabular-nums text-ouro-escuro">
            {l.pl ? formatBRL(l.pl) : "PL a definir"}
          </span>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ color: info.color, backgroundColor: info.bg, borderColor: info.color }}
          >
            {info.label}
          </span>
        </div>
        {l.passo && (
          <div className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{l.passo}</div>
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
                investRetornoSoon(l.retorno) ? "font-semibold text-ouro-escuro" : "text-slate-400",
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
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
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

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={recorte} onValueChange={(v) => setRecorteMode(v as SdrRecorte)}>
            <TabsList>
              <TabsTrigger value="meus">Meus leads</TabsTrigger>
              <TabsTrigger value="todos">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={respFilter} onValueChange={setRespFilter}>
              <SelectTrigger className="w-[170px]">
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

            <Select value={faixaFilter} onValueChange={(v) => setFaixaFilter(v as "all" | InvestFaixa)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as faixas</SelectItem>
                {INVEST_FAIXAS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {INVEST_FAIXA_INFO[f].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortMode(v as SdrSortBy)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
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
          </div>
        </div>

        {data.isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando fila...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {INVEST_SDR_BUCKETS.map((bucket) => {
              const items = buckets[bucket.key];
              const groups = bucket.key === "ativas" ? groupByEtapa(items) : null;
              const showGroups = !!groups && groups.length > 1;
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
                  <div className="flex min-h-[80px] flex-col gap-3 p-2">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 px-2 py-4 text-center text-[11px] text-slate-400">
                        Nada aqui
                      </div>
                    ) : showGroups ? (
                      groups.map((g) => {
                        const info = INVEST_ETAPA_INFO[g.etapa];
                        return (
                          <div key={g.etapa} className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
                              {info.label}
                              <span className="tabular-nums">{g.items.length}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {g.items.map((l) => renderCard(l, bucket.color))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      items.map((l) => renderCard(l, bucket.color))
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
        onScheduleReuniao={openReuniao}
      />
      <InvestReuniaoDialog
        open={reuniaoOpen}
        onClose={() => setReuniaoOpen(false)}
        lead={reuniaoLead}
      />
    </AppLayout>
  );
}
