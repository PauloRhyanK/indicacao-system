import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { SectionHeader } from "./Feedback";
import { inputClass } from "./SlideOver";
import { fetchProfiles, updateUserPersonalDailyTarget } from "@/lib/cais-api";

function TeamMemberGoalRow({ id, name, target }: { id: string; name: string; target: number | null }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(target != null ? String(target) : "");

  useEffect(() => {
    setAmount(target != null ? String(target) : "");
  }, [target]);

  const mutation = useMutation({
    mutationFn: (value: number | null) => updateUserPersonalDailyTarget(id, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-[160px] flex-1">
        <p className="text-[13px] font-medium text-azul-profundo">{name}</p>
      </div>
      <label className="block w-[160px]">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">Meta do dia (R$)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Meta da empresa"
        />
      </label>
      <Button
        type="button"
        variant="gold"
        disabled={mutation.isPending || !amount}
        onClick={() => mutation.mutate(Number(amount))}
      >
        Salvar
      </Button>
      {target != null && (
        <Button
          type="button"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(null)}
        >
          Usar meta da empresa
        </Button>
      )}
    </div>
  );
}

/** Admin de metas: define a meta pessoal do dia de cada pessoa (KUS). */
export function TeamPersonalGoalsCard() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <SectionHeader>Metas pessoais da equipe</SectionHeader>
      <p className="mb-3 text-[13px] text-slate-500">
        Defina a meta pessoal do dia de cada pessoa. Quem não tiver meta pessoal usa a meta da
        empresa.
      </p>
      {profiles.isLoading ? (
        <p className="text-[13px] text-slate-400">Carregando...</p>
      ) : (
        <div>
          {(profiles.data ?? []).map((p) => (
            <TeamMemberGoalRow key={p.id} id={p.id} name={p.name} target={p.personal_daily_target} />
          ))}
        </div>
      )}
    </div>
  );
}
