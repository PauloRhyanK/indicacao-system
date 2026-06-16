import type { RjClasses } from "@/lib/cais-api";
import {
  RJ_CLASSE_LABELS,
  RJ_CLASSE_VALUES,
  RJ_CLASSE_VOTE,
} from "@/lib/rj-constants";
import { formatRjCompact } from "@/lib/rj-format";
import { cn } from "@/lib/utils";

export function RjClassesPanel({ classes }: { classes: RjClasses }) {
  const max = Math.max(
    ...RJ_CLASSE_VALUES.map((k) => classes[k].valor),
    classes.fora.valor,
  );

  const barWidth = (valor: number, count: number) => {
    if (!max) return count ? 3 : 0;
    return Math.max((valor / max) * 100, count ? 3 : 0);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-azul-profundo">Por classe</h3>
      <div className="space-y-3">
        {RJ_CLASSE_VALUES.map((k) => (
          <ClassRow
            key={k}
            tag={k}
            label={RJ_CLASSE_LABELS[k].split("— ")[1] ?? RJ_CLASSE_LABELS[k]}
            vote={RJ_CLASSE_VOTE[k]}
            agg={classes[k]}
            width={barWidth(classes[k].valor, classes[k].count)}
          />
        ))}
        <div className="border-t border-slate-100 pt-3">
          <ClassRow
            tag="FORA"
            label="Fora da RJ"
            vote="não vota"
            agg={classes.fora}
            width={Math.min(barWidth(classes.fora.valor, classes.fora.count), 100)}
            fora
          />
        </div>
      </div>
    </div>
  );
}

function ClassRow({
  tag,
  label,
  vote,
  agg,
  width,
  fora,
}: {
  tag: string;
  label: string;
  vote: string;
  agg: { valor: number; count: number };
  width: number;
  fora?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "w-10 shrink-0 text-center text-[10px] font-bold tracking-wide",
          fora ? "text-red-600" : "text-azul-profundo",
        )}
      >
        {tag}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-slate-700">
          {label}{" "}
          <span className="text-slate-400">· {vote}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full", fora ? "bg-red-300" : "bg-azul-profundo/70")}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <div className={cn("shrink-0 text-right text-[12px] tabular-nums", fora && "text-red-700")}>
        <div className="font-medium">{formatRjCompact(agg.valor)}</div>
        <div className="text-[10px] text-slate-400">
          {agg.count} credor{agg.count === 1 ? "" : "es"}
        </div>
      </div>
    </div>
  );
}
