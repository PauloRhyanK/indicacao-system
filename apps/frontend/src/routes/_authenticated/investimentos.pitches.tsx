import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, MessageSquareQuote, Plus, Search } from "lucide-react";
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
import { InvestPitchDialog } from "@/components/cais/invest/InvestPitchDialog";
import { PitchFaixaBadge } from "@/components/cais/invest/InvestPitchView";
import { requireInvestPerm } from "@/lib/invest-guards";
import { usePermissions } from "@/lib/use-permissions";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  fetchInvestPitches,
  type InvestFaixa,
  type InvestPitch,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/pitches")({
  head: () => ({ meta: [{ title: "Pitches · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) => requireInvestPerm(context, ["investimentos.view"]),
  component: InvestPitchesPage,
});

const ALL = "__all__";

function InvestPitchesPage() {
  const { canAny } = usePermissions();
  const canManage = canAny("investimentos.manage");

  const { data: pitches = [], isLoading } = useQuery({
    queryKey: ["invest-pitches"],
    queryFn: () => fetchInvestPitches(),
  });

  const [q, setQ] = useState("");
  const [faixaFilter, setFaixaFilter] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvestPitch | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pitches.filter((p) => {
      if (faixaFilter !== ALL && p.faixa !== faixaFilter) return false;
      if (term && !`${p.titulo} ${p.gancho}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [pitches, q, faixaFilter]);

  // Agrupa por faixa preservando a ordem canônica.
  const byFaixa = useMemo(() => {
    return INVEST_FAIXAS.map((f) => ({
      faixa: f,
      items: filtered.filter((p) => p.faixa === f),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: InvestPitch) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <MessageSquareQuote className="h-5 w-5 text-ouro-escuro" /> Pitches
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Playbook comercial por segmento · o pitch aparece na qualificação e na reunião
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo pitch
              </Button>
            )}
            <Link
              to="/investimentos"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título ou gancho…"
              className="pl-9"
            />
          </div>
          <Select value={faixaFilter} onValueChange={setFaixaFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as faixas</SelectItem>
              {INVEST_FAIXAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {INVEST_FAIXA_INFO[f].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando pitches...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
            <p className="text-sm font-semibold text-slate-600">Nenhum pitch encontrado</p>
            <p className="mt-1 text-xs text-slate-400">
              {canManage
                ? "Crie o primeiro pitch em “Novo pitch”."
                : "Peça a um gestor para cadastrar os pitches do playbook."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {byFaixa.map((group) => (
              <div key={group.faixa}>
                <div className="mb-2 flex items-center gap-2">
                  <PitchFaixaBadge faixa={group.faixa as InvestFaixa} />
                  <span className="text-xs text-slate-400">{group.items.length} pitch(es)</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {group.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded-lg border border-slate-200 bg-branco p-4 text-left shadow-sm transition-colors hover:border-ouro/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-semibold text-azul-profundo">{p.titulo}</h3>
                        {p.padrao_do_segmento && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ouro-escuro">
                            ★ Padrão
                          </span>
                        )}
                      </div>
                      {p.gancho && (
                        <p className="mt-1.5 line-clamp-2 text-[13px] italic text-slate-500">
                          {p.gancho}
                        </p>
                      )}
                      {!p.ativo && (
                        <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Inativo
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InvestPitchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        pitch={editing}
        canManage={canManage}
      />
    </AppLayout>
  );
}
