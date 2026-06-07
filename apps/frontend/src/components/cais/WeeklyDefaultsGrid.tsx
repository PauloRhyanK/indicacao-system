import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { SectionHeader } from "./Feedback";
import { inputClass } from "./SlideOver";
import {
  fetchDailyDefaults,
  saveDailyDefaults,
  type DailyGoalDefault,
} from "@/lib/cais-api";
import { cn } from "@/lib/utils";

const WEEKDAYS: { weekday: number; label: string }[] = [
  { weekday: 0, label: "Domingo" },
  { weekday: 6, label: "Sábado" },
  { weekday: 1, label: "Segunda" },
  { weekday: 2, label: "Terça" },
  { weekday: 3, label: "Quarta" },
  { weekday: 4, label: "Quinta" },
  { weekday: 5, label: "Sexta" },
];

function emptyDefaults(): DailyGoalDefault[] {
  return WEEKDAYS.map((d) => ({ weekday: d.weekday, amount: 0 }));
}

export function WeeklyDefaultsGrid({ readOnly = false }: { readOnly?: boolean }) {
  const qc = useQueryClient();
  const defaultsQuery = useQuery({
    queryKey: ["daily-defaults"],
    queryFn: fetchDailyDefaults,
  });

  const [rows, setRows] = useState<DailyGoalDefault[]>(emptyDefaults());

  useEffect(() => {
    if (!defaultsQuery.data) return;
    const map = new Map(defaultsQuery.data.map((d) => [d.weekday, d.amount]));
    setRows(
      WEEKDAYS.map((d) => ({
        weekday: d.weekday,
        amount: map.get(d.weekday) ?? 0,
      })),
    );
  }, [defaultsQuery.data]);

  const mutation = useMutation({
    mutationFn: () => saveDailyDefaults(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-defaults"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
    },
  });

  const errorMessage =
    defaultsQuery.isError
      ? "Não foi possível carregar a grade semanal."
      : mutation.isError
        ? mutation.error instanceof Error
          ? mutation.error.message
          : "Não foi possível salvar a grade semanal."
        : null;

  return (
    <div className="h-full min-w-0 rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Grade Semanal Padrão</SectionHeader>
      <p className="mb-4 text-[13px] text-slate-500">
        Valor base por dia da semana. Usado quando não houver override na data.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!readOnly) mutation.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          {WEEKDAYS.map((day) => {
            const row = rows.find((r) => r.weekday === day.weekday);
            return (
              <label key={day.weekday} className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-slate-700">
                  {day.label}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  readOnly={readOnly}
                  className={cn(inputClass, readOnly && "cursor-default bg-slate-50 text-slate-700")}
                  value={row?.amount ?? 0}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.weekday === day.weekday
                          ? { ...r, amount: Number(e.target.value) }
                          : r,
                      ),
                    )
                  }
                />
              </label>
            );
          })}
        </div>
        {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="gold" disabled={mutation.isPending || defaultsQuery.isLoading}>
            {mutation.isPending ? "Salvando..." : "Salvar grade semanal"}
          </Button>
          {mutation.isSuccess && !mutation.isPending && (
            <span className="text-[13px] text-status-green">Grade salva com sucesso.</span>
          )}
          {errorMessage && (
            <span className="text-[13px] text-status-red">{errorMessage}</span>
          )}
        </div>
        )}
      </form>
    </div>
  );
}
