import { KPICard } from "@/components/cais/KPICard";
import type { RjKpis } from "@/lib/cais-api";
import { formatRjCompact } from "@/lib/rj-format";

export function RjKpiGrid({ kpis }: { kpis: RjKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KPICard
        label="Credores no condomínio"
        value={kpis.count}
        sub={`${kpis.votam} votam · ${kpis.foraCount} fora da RJ`}
      />
      <KPICard
        label="Confirmados"
        value={kpis.confCount}
        sub={kpis.confPct != null ? `${kpis.confPct}% do total` : "—"}
        valueClassName="text-emerald-700"
      />
      <KPICard
        label="Valor com voto"
        value={formatRjCompact(kpis.votoTotal)}
        sub={`${kpis.votam} credores elegíveis`}
      />
      <KPICard
        label="Valor confirmado que vota"
        value={formatRjCompact(kpis.votoConf)}
        sub={
          kpis.votoConfCount
            ? `${kpis.votoConfCount} credor${kpis.votoConfCount !== 1 ? "es" : ""} confirmado${kpis.votoConfCount !== 1 ? "s" : ""}`
            : "Nenhum confirmado ainda"
        }
        valueClassName="text-ouro"
      />
    </div>
  );
}
