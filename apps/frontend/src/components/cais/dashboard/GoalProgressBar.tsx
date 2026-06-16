import { cn } from "@/lib/utils";

interface GoalProgressBarProps {
  paid: number;
  pending: number;
  target: number;
  className?: string;
  trackClassName?: string;
  paidClassName?: string;
  pendingClassName?: string;
  heightClassName?: string;
  animated?: boolean;
}

function segmentWidth(amount: number, target: number): number {
  if (target <= 0 || amount <= 0) return 0;
  return Math.min(100, (amount / target) * 100);
}

export function GoalProgressBar({
  paid,
  pending,
  target,
  className,
  trackClassName = "bg-slate-200",
  paidClassName = "bg-ouro",
  pendingClassName = "bg-slate-300/80",
  heightClassName = "h-3",
  animated = true,
}: GoalProgressBarProps) {
  const paidW = animated ? segmentWidth(paid, target) : 0;
  const pendingW = animated ? segmentWidth(pending, target) : 0;

  return (
    <div className={cn("w-full overflow-hidden rounded-full", heightClassName, trackClassName, className)}>
      <div className="flex h-full">
        {paidW > 0 && (
          <div
            className={cn("h-full rounded-l-full", paidClassName, pendingW <= 0 && "rounded-r-full")}
            style={{ width: `${paidW}%`, transition: animated ? "width 1s ease-out" : undefined }}
          />
        )}
        {pendingW > 0 && (
          <div
            className={cn("h-full", pendingClassName, paidW <= 0 ? "rounded-full" : "rounded-r-full")}
            style={{ width: `${pendingW}%`, transition: animated ? "width 1s ease-out" : undefined }}
          />
        )}
      </div>
    </div>
  );
}

export function RankingAmountBar({
  paid,
  pending,
  maxTotal,
  paidColorClassName = "bg-ouro",
  pendingColorClassName = "bg-slate-300/70",
}: {
  paid: number;
  pending: number;
  maxTotal: number;
  paidColorClassName?: string;
  pendingColorClassName?: string;
}) {
  const scale = maxTotal > 0 ? maxTotal : 1;
  const paidPct = Math.max(paid > 0 ? 4 : 0, Math.round((paid / scale) * 100));
  const pendingPct = pending > 0 ? Math.max(4, Math.round((pending / scale) * 100)) : 0;

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div className="flex h-full">
        {paidPct > 0 && (
          <div
            className={cn("h-full", paidColorClassName, pendingPct <= 0 && "rounded-full")}
            style={{ width: `${paidPct}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className={cn("h-full", pendingColorClassName, paidPct <= 0 ? "rounded-full" : "rounded-r-full")}
            style={{ width: `${pendingPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
