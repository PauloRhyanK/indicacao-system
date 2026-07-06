import { useMemo } from "react";
import {
  INVEST_ETAPAS,
  INVEST_ETAPAS_ABERTAS,
  INVEST_ETAPA_INFO,
  formatBRLCompact,
  type InvestEtapa,
  type InvestLead,
} from "@/lib/invest-api";

/** Funil por etapa — barras proporcionais ao PL de cada etapa. */
export function InvestFunnel({ leads }: { leads: InvestLead[] }) {
  const agg = useMemo(() => {
    const map = new Map<InvestEtapa, { v: number; n: number }>();
    for (const e of INVEST_ETAPAS) map.set(e, { v: 0, n: 0 });
    for (const l of leads) {
      const a = map.get(l.etapa);
      if (a) {
        a.v += l.pl;
        a.n += 1;
      }
    }
    return map;
  }, [leads]);

  const max = Math.max(...INVEST_ETAPAS_ABERTAS.map((e) => agg.get(e)?.v ?? 0), 1);

  const row = (etapa: InvestEtapa) => {
    const info = INVEST_ETAPA_INFO[etapa];
    const a = agg.get(etapa) ?? { v: 0, n: 0 };
    const w = Math.min(Math.max((a.v / max) * 100, a.n ? 3 : 0), 100);
    return (
      <div key={etapa} className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-slate-700">{info.label}</div>
          <div className="mt-1 h-[5px] overflow-hidden rounded-full border border-slate-100 bg-slate-50">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${w}%`, background: info.color }}
            />
          </div>
        </div>
        <div className="text-right text-xs tabular-nums text-ouro-escuro">
          {formatBRLCompact(a.v)}
          <div className="text-[10px] font-normal text-slate-400">
            {a.n} lead{a.n === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {INVEST_ETAPAS_ABERTAS.map(row)}
      <div className="my-0.5 h-px bg-slate-100" />
      {(["ganho", "perdido"] as InvestEtapa[]).map(row)}
    </div>
  );
}
