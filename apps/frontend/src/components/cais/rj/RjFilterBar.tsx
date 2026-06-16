import type { RjCredor } from "@/lib/cais-api";
import {
  RJ_FILTER_CHIPS,
  type RjFilterKey,
} from "@/lib/rj-constants";
import { cn } from "@/lib/utils";

export function RjFilterBar({
  credores,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  credores: RjCredor[];
  filter: RjFilterKey;
  onFilterChange: (f: RjFilterKey) => void;
  search: string;
  onSearchChange: (q: string) => void;
}) {
  const counts = countByFilter(credores);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RJ_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilterChange(chip.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              filter === chip.key
                ? "border-azul-profundo bg-azul-profundo text-branco"
                : "border-slate-200 bg-branco text-slate-600 hover:border-slate-300",
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] tabular-nums",
                filter === chip.key ? "bg-white/20" : "bg-slate-100",
              )}
            >
              {counts[chip.key]}
            </span>
          </button>
        ))}
      </div>
      <input
        type="search"
        placeholder="Buscar por nome, passo ou contato..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full max-w-md rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-azul-profundo focus:border-ouro focus:outline-hidden focus:ring-3 focus:ring-[rgba(217,189,126,0.18)]"
      />
    </div>
  );
}

function countByFilter(credores: RjCredor[]): Record<RjFilterKey, number> {
  const sc = {
    confirmado: 0,
    juridico: 0,
    negociacao: 0,
    semcontato: 0,
    recusou: 0,
    fora: 0,
  };

  for (const c of credores) {
    sc[c.status]++;
    if (!c.sujeito) sc.fora++;
  }

  return {
    all: credores.length,
    ...sc,
  };
}
