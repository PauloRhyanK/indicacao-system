import { Button } from "@/components/cais/Button";
import type { RjSugestaoStatusCredor } from "@/lib/cais-api";

export function RjCredorStatusSuggestionBanner({
  sugestao,
  onConfirm,
  onDismiss,
  pending,
}: {
  sugestao: RjSugestaoStatusCredor;
  onConfirm: () => void;
  onDismiss: () => void;
  pending: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
      <span>{sugestao.label}</span>
      <div className="flex gap-2">
        <Button
          variant="gold"
          className="px-3 py-1.5 text-[12px]"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Atualizando…" : "Confirmar"}
        </Button>
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-[12px]"
          onClick={onDismiss}
          disabled={pending}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}
