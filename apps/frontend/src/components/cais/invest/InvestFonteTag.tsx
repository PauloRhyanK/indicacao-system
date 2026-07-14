import { cn } from "@/lib/utils";
import { investLeadFonte } from "@/lib/invest-api";

const FONTE_STYLES = {
  base_btg: {
    label: "Base BTG",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  captacao: {
    label: "Captação",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
} as const;

export function InvestFonteTag({
  investClienteId,
  className,
}: {
  investClienteId: string | null;
  className?: string;
}) {
  const fonte = investLeadFonte({ invest_cliente_id: investClienteId });
  const style = FONTE_STYLES[fonte];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
