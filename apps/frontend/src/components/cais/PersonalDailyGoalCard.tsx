import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { SectionHeader } from "./Feedback";
import { inputClass } from "./SlideOver";
import { updatePersonalDailyTarget } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

interface PersonalDailyGoalCardProps {
  initialAmount: number | null;
  companyDailyTarget?: number;
  compact?: boolean;
  onSaved?: () => void;
}

export function PersonalDailyGoalCard({
  initialAmount,
  companyDailyTarget,
  compact,
  onSaved,
}: PersonalDailyGoalCardProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setAmount(initialAmount != null ? String(initialAmount) : "");
  }, [initialAmount]);

  const mutation = useMutation({
    mutationFn: () => updatePersonalDailyTarget(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-dashboard"] });
      onSaved?.();
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => updatePersonalDailyTarget(null),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["personal-dashboard"] });
      onSaved?.();
    },
  });

  return (
    <div className={cn("rounded-md border border-slate-200 bg-branco p-5", compact && "p-4")}>
      {!compact && <SectionHeader>Minha meta do dia</SectionHeader>}
      <p className={cn("text-[13px] text-slate-500", compact ? "mb-3" : "mb-4")}>
        {initialAmount != null
          ? "Sua meta pessoal substitui a meta da empresa no dashboard."
          : companyDailyTarget != null && companyDailyTarget > 0
            ? `Sem meta pessoal, usamos a meta da empresa (${companyDailyTarget.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}).`
            : "Defina quanto você quer vender hoje."}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (amount) mutation.mutate();
        }}
      >
        <label className="block min-w-[180px] flex-1">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-700">Objetivo (R$)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex.: 120000"
          />
        </label>
        <Button type="submit" variant="gold" disabled={mutation.isPending || !amount}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {initialAmount != null && (
          <Button
            type="button"
            variant="ghost"
            disabled={clearMutation.isPending}
            onClick={() => clearMutation.mutate()}
          >
            Usar meta da empresa
          </Button>
        )}
      </form>
    </div>
  );
}
