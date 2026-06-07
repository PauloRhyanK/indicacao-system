import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { SectionHeader } from "./Feedback";
import { inputClass } from "./SlideOver";
import {
  fetchMetaPeriod,
  formatBRL,
  formatDate,
  updateGoalPeriod,
} from "@/lib/cais-api";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function PeriodGoalCard({ readOnly = false }: { readOnly?: boolean }) {
  const qc = useQueryClient();
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });

  const [target, setTarget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!meta.data) return;
    setTarget(String(meta.data.target_value));
    setStartDate(meta.data.start_date.slice(0, 10));
    setEndDate(meta.data.end_date.slice(0, 10));
  }, [meta.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateGoalPeriod(meta.data!.id, {
        target_value: Number(target),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
    },
  });

  if (meta.isLoading) return null;
  if (!meta.data) {
    return (
      <div className="rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Meta do Período</SectionHeader>
        <p className="text-[13px] text-slate-500">Nenhuma meta configurada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Meta do Período</SectionHeader>
      <p className="mb-4 text-[13px] text-slate-500">
        Progresso atual: {formatBRL(meta.data.current_value)} de {formatBRL(meta.data.target_value)}
      </p>
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-700">Objetivo (R$)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            readOnly={readOnly}
            className={cn(inputClass, readOnly && "cursor-default bg-slate-50 text-slate-700")}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-700">Início</span>
          <input
            type="date"
            required
            readOnly={readOnly}
            className={cn(inputClass, readOnly && "cursor-default bg-slate-50 text-slate-700")}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-700">Fim</span>
          <input
            type="date"
            required
            readOnly={readOnly}
            className={cn(inputClass, readOnly && "cursor-default bg-slate-50 text-slate-700")}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        {!readOnly && (
        <div className="sm:col-span-3">
          <Button type="submit" variant="gold" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar meta do período"}
          </Button>
        </div>
        )}
      </form>
      <p className="mt-2 text-[11px] text-slate-500">
        Período: {formatDate(meta.data.start_date)} — {formatDate(meta.data.end_date)}
      </p>
    </div>
  );
}
