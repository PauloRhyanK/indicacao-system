import { Badge } from "./Badge";
import { Button } from "./Button";

export function PendingRewardsPanel({
  count,
  onStartQueue,
  disabled,
}: {
  count: number;
  onStartQueue: () => void;
  disabled?: boolean;
}) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Badge variant="amber" className="mt-0.5 shrink-0">
          {count}
        </Badge>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-900">
            Recompensas pendentes de conferência
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-amber-800">
            Após a atualização do sistema, confira e registre o pagamento das recompensas das
            vendas já realizadas.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="gold"
        className="shrink-0"
        disabled={disabled}
        onClick={onStartQueue}
      >
        Conferir em lote
      </Button>
    </div>
  );
}
