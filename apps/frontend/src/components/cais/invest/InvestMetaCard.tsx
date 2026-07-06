import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/cais/Feedback";
import { fetchInvestConfig, updateInvestConfig } from "@/lib/invest-api";
import { usePermissions } from "@/lib/use-permissions";

/** Editor da meta de captação BNF (invest_config), usado na tela de Metas. */
export function InvestMetaCard() {
  const { can } = usePermissions();
  const canManage = can("investimentos.manage");
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["invest-config"], queryFn: fetchInvestConfig });
  const meta = config.data?.meta ?? 0;
  const [draft, setDraft] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (v: number) => updateInvestConfig(v),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["invest-config"] });
      qc.invalidateQueries({ queryKey: ["invest-leads"] });
      toast.success("Meta BNF atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = () => {
    if (draft === null) return;
    const cleaned = draft.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const v = parseFloat(cleaned);
    if (!Number.isFinite(v) || v < 0) {
      toast.error("Valor de meta inválido");
      return;
    }
    mut.mutate(v);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Meta de captação — BNF (Investimento)</SectionHeader>
      <p className="mb-3 text-[13px] text-slate-500">
        Meta de captação / AUC da campanha BNF. Alimenta o dashboard e o painel TV de investimento.
      </p>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          className="max-w-56 tabular-nums"
          placeholder="ex.: 50.000.000"
          disabled={!canManage}
          value={draft ?? (meta ? meta.toLocaleString("pt-BR") : "")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== null && save()}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <span className="text-xs text-slate-500">R$ (AUC)</span>
      </div>
      {!canManage && (
        <p className="mt-2 text-[12px] text-slate-400">Somente gestor pode alterar a meta.</p>
      )}
    </div>
  );
}
