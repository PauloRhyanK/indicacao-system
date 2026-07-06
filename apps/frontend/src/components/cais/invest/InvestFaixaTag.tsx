import { INVEST_FAIXA_INFO, type InvestFaixa } from "@/lib/invest-api";
import { cn } from "@/lib/utils";

/** Tag colorida da faixa do cliente (Digital / Private / Wealth). */
export function InvestFaixaTag({
  faixa,
  className,
}: {
  faixa: InvestFaixa | null;
  className?: string;
}) {
  if (!faixa) return null;
  const info = INVEST_FAIXA_INFO[faixa];
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ color: info.color, backgroundColor: info.bg }}
    >
      {info.label}
    </span>
  );
}
