import { cn } from "@/lib/utils";

export function KPICard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-slate-200 bg-branco p-[18px] transition-all duration-200 hover:border-ouro before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-ouro">
      <div className="text-[11px] font-medium uppercase tracking-[0.6px] text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[24px] font-semibold tabular-nums text-azul-profundo",
          valueClassName,
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
