import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "./Button";
import { SectionHeader } from "./Feedback";
import { inputClass } from "./SlideOver";
import {
  deleteDailyOverride,
  fetchDailyOverrides,
  saveDailyOverride,
  type DailyGoalOverride,
} from "@/lib/cais-api";
import { cn } from "@/lib/utils";

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DailyGoalCalendar({ readOnly = false }: { readOnly?: boolean }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | undefined>();
  const [amount, setAmount] = useState("");

  const monthStr = monthKey(month);
  const overrides = useQuery({
    queryKey: ["daily-overrides", monthStr],
    queryFn: () => fetchDailyOverrides(monthStr),
  });

  const overrideMap = useMemo(() => {
    const map = new Map<string, DailyGoalOverride>();
    (overrides.data ?? []).forEach((o) => map.set(o.date, o));
    return map;
  }, [overrides.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDailyOverride(toDateStr(selected!), {
        amount: Number(amount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-overrides"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      setSelected(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (date: string) => deleteDailyOverride(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-overrides"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      setSelected(undefined);
    },
  });

  const overriddenDates = useMemo(
    () =>
      (overrides.data ?? []).map((o) => {
        const [y, m, d] = o.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      }),
    [overrides.data],
  );

  const selectedOverride = selected ? overrideMap.get(toDateStr(selected)) : undefined;

  return (
    <div className="@container h-full min-w-0 rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Calendário de Overrides</SectionHeader>
      <p className="mb-4 text-[13px] text-slate-500">
        Clique em um dia para definir um valor específico que substitui o padrão da semana.
      </p>

      <div className="flex flex-col gap-4 @md:flex-row @md:items-start">
        <div className="shrink-0">
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            onSelect={(day) => {
              setSelected(day);
              if (day) {
                const key = toDateStr(day);
                const ov = overrideMap.get(key);
                setAmount(ov?.amount != null ? String(ov.amount) : "");
              }
            }}
            modifiers={{ overridden: overriddenDates }}
            modifiersClassNames={{
              overridden: "bg-ouro/20 font-semibold text-azul-profundo",
            }}
            className="rounded-md border border-slate-200"
          />
        </div>

        {selected && (
          <div className="w-full min-w-0 @md:flex-1 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-[14px] font-medium text-azul-profundo">
              {selected.toLocaleDateString("pt-BR")}
            </p>
            {selectedOverride?.presetSlug && (
              <p className="mb-2 text-[12px] text-slate-500">
                Preset ativo: {selectedOverride.presetSlug}
              </p>
            )}
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-700">
                Valor base (R$)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                readOnly={readOnly}
                className={cn(inputClass, readOnly && "cursor-default bg-white text-slate-700")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Substitui o padrão do dia"
              />
            </label>
            {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="gold"
                disabled={saveMutation.isPending || !amount}
                onClick={() => saveMutation.mutate()}
              >
                Salvar override
              </Button>
              {selectedOverride && (
                <Button
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(toDateStr(selected))}
                >
                  Remover
                </Button>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      {(overrides.data ?? []).length > 0 && (
        <ul className={cn("mt-4 space-y-1 text-[12px] text-slate-600")}>
          {(overrides.data ?? []).map((o) => (
            <li key={o.date}>
              {new Date(o.date + "T12:00:00").toLocaleDateString("pt-BR")}:{" "}
              {o.amount != null ? `R$ ${o.amount.toLocaleString("pt-BR")}` : "—"}
              {o.presetSlug ? ` · preset ${o.presetSlug}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
