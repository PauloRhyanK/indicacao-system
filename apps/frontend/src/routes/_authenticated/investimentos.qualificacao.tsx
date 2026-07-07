import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, LayoutDashboard, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireInvestPerm } from "@/lib/invest-guards";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  faixaFromPl,
  fetchInvestLeads,
  fetchInvestPitches,
  formatBRL,
  investNeedsQualification,
  investOrigemLabel,
  qualifyInvestLead,
  type InvestFaixa,
  type InvestLead,
  type InvestPitch,
} from "@/lib/invest-api";

const NONE = "__none__";

export const Route = createFileRoute("/_authenticated/investimentos/qualificacao")({
  head: () => ({ meta: [{ title: "Qualificação · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) =>
    requireInvestPerm(context, ["investimentos.qualify", "investimentos.manage"]),
  component: InvestQualificacaoPage,
});

function InvestQualificacaoPage() {
  const queryClient = useQueryClient();
  const data = useQuery({ queryKey: ["invest-leads"], queryFn: fetchInvestLeads });
  const pitches = useQuery({
    queryKey: ["invest-pitches"],
    queryFn: () => fetchInvestPitches({ ativo: true }),
  });
  const leads = useMemo(() => data.data?.leads ?? [], [data.data]);
  const fila = useMemo(
    () => leads.filter(investNeedsQualification).sort((a, b) => b.pl - a.pl),
    [leads],
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <BadgeCheck className="h-5 w-5 text-ouro-escuro" /> Fila de qualificação
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Valide os dados e defina a faixa · o lead então segue para o SDR
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
        ) : fila.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-branco p-12 text-center">
            <p className="text-sm font-semibold text-slate-600">Nada para qualificar 🎉</p>
            <p className="mt-1 text-xs text-slate-400">
              Novos leads captados aparecem aqui até serem qualificados.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fila.map((lead) => (
              <QualificaRow
                key={lead.id}
                lead={lead}
                pitches={pitches.data ?? []}
                onDone={() => queryClient.invalidateQueries({ queryKey: ["invest-leads"] })}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QualificaRow({
  lead,
  pitches,
  onDone,
}: {
  lead: InvestLead;
  pitches: InvestPitch[];
  onDone: () => void;
}) {
  const [faixa, setFaixa] = useState<InvestFaixa>(lead.faixa ?? faixaFromPl(lead.pl));
  const [pitchId, setPitchId] = useState<string | null>(lead.pitch_id);

  // Pitches sugeridos primeiro pela faixa escolhida, depois o resto.
  const orderedPitches = useMemo(() => {
    const match = pitches.filter((p) => p.faixa === faixa);
    const rest = pitches.filter((p) => p.faixa !== faixa);
    return [...match, ...rest];
  }, [pitches, faixa]);

  const mutation = useMutation({
    mutationFn: () => qualifyInvestLead(lead.id, faixa, pitchId),
    onSuccess: () => {
      toast.success(`${lead.nome} qualificado como ${INVEST_FAIXA_INFO[faixa].label}`);
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-branco p-3 shadow-sm">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-azul-profundo">{lead.nome}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {investOrigemLabel(lead.origem)} · {lead.pl ? formatBRL(lead.pl) : "PL a definir"}
          {lead.responsavel_nome ? ` · ${lead.responsavel_nome}` : ""}
          {lead.abaixo_do_piso ? " · ⚠ abaixo do piso" : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={faixa} onValueChange={(v) => setFaixa(v as InvestFaixa)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVEST_FAIXAS.map((f) => (
              <SelectItem key={f} value={f}>
                {INVEST_FAIXA_INFO[f].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={pitchId ?? NONE}
          onValueChange={(v) => setPitchId(v === NONE ? null : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Pitch — como vender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Sem pitch</SelectItem>
            {orderedPitches.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {INVEST_FAIXA_INFO[p.faixa].label} · {p.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Qualificar
        </Button>
      </div>
    </div>
  );
}
