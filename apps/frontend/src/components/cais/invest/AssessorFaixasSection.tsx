import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionHeader } from "@/components/cais/Feedback";
import { fetchProfiles } from "@/lib/cais-api";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  fetchAssessorFaixas,
  setAssessorFaixas,
  type InvestFaixa,
} from "@/lib/invest-api";
import { cn } from "@/lib/utils";

/**
 * Competência de faixa por assessor. Usada pela trava de faixa ao marcar
 * reunião: assessor sem faixa marcada atende todas (não bloqueia por engano).
 */
export function AssessorFaixasSection() {
  const qc = useQueryClient();
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const faixas = useQuery({ queryKey: ["assessor-faixas"], queryFn: fetchAssessorFaixas });

  const map = faixas.data ?? {};

  const mutation = useMutation({
    mutationFn: ({ userId, next }: { userId: string; next: InvestFaixa[] }) =>
      setAssessorFaixas(userId, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessor-faixas"] });
      qc.invalidateQueries({ queryKey: ["invest-assessores"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = useMemo(() => profiles.data ?? [], [profiles.data]);

  const toggle = (userId: string, faixa: InvestFaixa) => {
    const current = map[userId] ?? [];
    const next = current.includes(faixa)
      ? current.filter((f) => f !== faixa)
      : [...current, faixa];
    mutation.mutate({ userId, next });
  };

  return (
    <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Assessores — faixa que atende</SectionHeader>
      <p className="mb-3 text-[13px] text-slate-500">
        Define quais faixas cada assessor atende. Ao marcar reunião, o SDR só vê assessores
        compatíveis com a faixa do lead. Sem nenhuma marcação = atende todas.
      </p>
      {profiles.isLoading ? (
        <p className="text-[13px] text-slate-500">Carregando…</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {rows.map((p) => {
            const current = map[p.id] ?? [];
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-[14px] font-medium text-azul-profundo">{p.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  {INVEST_FAIXAS.map((f) => {
                    const active = current.includes(f);
                    const info = INVEST_FAIXA_INFO[f];
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggle(p.id, f)}
                        disabled={mutation.isPending}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                          active ? "" : "border-slate-200 text-slate-400 hover:border-slate-300",
                        )}
                        style={active ? { color: info.color, backgroundColor: info.bg, borderColor: info.color } : undefined}
                      >
                        {info.label}
                      </button>
                    );
                  })}
                  {current.length === 0 && (
                    <span className="self-center text-[11px] italic text-slate-400">atende todas</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
