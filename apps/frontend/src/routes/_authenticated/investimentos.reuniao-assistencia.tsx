import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  CalendarClock,
  LayoutDashboard,
  MessageSquareQuote,
  PhoneCall,
  User,
} from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import { CompromissadaCalculator } from "@/components/cais/invest/CompromissadaCalculator";
import { InvestPitchView } from "@/components/cais/invest/InvestPitchView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requireInvestPerm } from "@/lib/invest-guards";
import {
  fetchInvestLeads,
  fetchInvestPitches,
  fetchInvestReunioes,
  INVEST_FAIXA_INFO,
  type InvestLead,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/reuniao-assistencia")({
  head: () => ({ meta: [{ title: "Assistência na reunião · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) =>
    requireInvestPerm(context, ["investimentos.edit", "investimentos.manage"]),
  component: InvestReuniaoAssistenciaPage,
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

function InvestReuniaoAssistenciaPage() {
  const reunioes = useQuery({
    queryKey: ["invest-reunioes", "mine"],
    queryFn: () => fetchInvestReunioes({ scope: "mine" }),
  });
  const leads = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });
  const pitches = useQuery({
    queryKey: ["invest-pitches"],
    queryFn: () => fetchInvestPitches(),
  });

  const futuras = useMemo(() => {
    const now = Date.now();
    return (reunioes.data ?? [])
      .filter((r) => new Date(r.data_hora_inicio).getTime() >= now)
      .sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio));
  }, [reunioes.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => futuras.find((r) => r.id === selectedId) ?? futuras[0] ?? null,
    [futuras, selectedId],
  );

  const lead: InvestLead | undefined = useMemo(
    () => (leads.data?.leads ?? []).find((l) => l.id === selected?.lead.id),
    [leads.data, selected],
  );

  const pitch = useMemo(
    () => (pitches.data ?? []).find((p) => p.id === lead?.pitch_id),
    [pitches.data, lead],
  );

  const loading = reunioes.isLoading || leads.isLoading;
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <Calculator className="h-5 w-5 text-ouro-escuro" /> Assistência na reunião
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Dados do lead, pitch, relato do SDR e a calculadora — tudo num painel só
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lead && (
              <Button onClick={() => setCalcOpen(true)}>
                <Calculator className="mr-2 h-4 w-4" /> Calculadora compromissada
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

        {loading ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
            Carregando...
          </div>
        ) : futuras.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
            <p className="text-sm font-semibold text-slate-600">Nenhuma reunião futura</p>
            <p className="mt-1 text-xs text-slate-400">
              Quando você tiver uma reunião marcada, o painel de assistência aparece aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
            {/* Seletor de reunião */}
            <div className="space-y-2">
              {futuras.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-md border p-3 text-left shadow-sm transition-colors ${
                      active
                        ? "border-ouro bg-ouro/10"
                        : "border-slate-200 bg-branco hover:border-ouro/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums text-azul-profundo">
                      <CalendarClock className="h-3.5 w-3.5 text-ouro-escuro" />
                      {formatDataHora(r.data_hora_inicio)}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-azul-profundo">
                      {r.lead.nome}
                    </div>
                    {r.lead.faixa && (
                      <span
                        className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          color: INVEST_FAIXA_INFO[r.lead.faixa].color,
                          background: INVEST_FAIXA_INFO[r.lead.faixa].bg,
                        }}
                      >
                        {INVEST_FAIXA_INFO[r.lead.faixa].label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Painel de assistência */}
            {lead && (
              <div className="space-y-5">
                {/* Dados do lead */}
                <div className="rounded-lg border border-slate-200 bg-branco p-4">
                  <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-azul-profundo">
                    <User className="h-4 w-4 text-ouro-escuro" /> {lead.nome}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
                    <div>
                      <div className="text-slate-400">PL estimado</div>
                      <div className="font-mono font-semibold text-azul-profundo">
                        R$ {lead.pl.toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Contato</div>
                      <div className="font-medium text-slate-700">{lead.contato || "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Celular</div>
                      <div className="font-medium text-slate-700">{lead.celular || "—"}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Próximo passo</div>
                      <div className="font-medium text-slate-700">{lead.passo || "—"}</div>
                    </div>
                  </div>
                  {lead.obs && (
                    <p className="mt-3 border-t border-slate-100 pt-2 text-[12.5px] text-slate-600">
                      {lead.obs}
                    </p>
                  )}
                </div>

                {/* Relato do SDR */}
                {lead.sdr_relato && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-slate-600">
                      <PhoneCall className="h-4 w-4" /> Relato da ligação (SDR)
                    </h2>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                      {lead.sdr_relato}
                    </p>
                    {lead.sdr_relato_por && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        {lead.sdr_relato_por.name}
                        {lead.sdr_relato_em
                          ? ` · ${new Date(lead.sdr_relato_em).toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Pitch */}
                <div className="rounded-lg border border-slate-200 bg-branco p-4">
                  <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-azul-profundo">
                    <MessageSquareQuote className="h-4 w-4 text-ouro-escuro" /> Pitch
                  </h2>
                  {pitch ? (
                    <InvestPitchView pitch={pitch} />
                  ) : lead.pitch ? (
                    <p className="text-[13px] leading-relaxed text-slate-700">{lead.pitch}</p>
                  ) : (
                    <p className="text-[12.5px] text-slate-400">Nenhum pitch selecionado para este lead.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calculadora compromissada — modal sobreposto, aberto pelo botão do topo */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-0 p-0">
          <DialogHeader className="hidden">
            <DialogTitle>Calculadora compromissada</DialogTitle>
            <DialogDescription>Simulação de rendimento compromissada x CDB</DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center border-b border-slate-100 py-2.5 pl-5 pr-9">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-azul-profundo">
              <Calculator className="h-4 w-4 text-ouro-escuro" /> Calculadora compromissada PJ
            </h2>
          </div>
          <div className="overflow-y-auto px-5 py-4">
            {lead && <CompromissadaCalculator caixaInicial={lead.pl} leadNome={lead.nome} />}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
