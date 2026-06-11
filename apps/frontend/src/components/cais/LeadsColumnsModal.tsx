import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./Button";
import {
  getDefaultColumnVisibility,
  LEAD_GRID_COLUMN_CONFIGS,
  type LeadColumnVisibility,
} from "@/lib/leads-columns";

export function LeadsColumnsModal({
  open,
  onClose,
  visibility,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  visibility: LeadColumnVisibility;
  onApply: (visibility: LeadColumnVisibility) => void;
}) {
  const [draft, setDraft] = useState<LeadColumnVisibility>(visibility);

  useEffect(() => {
    if (open) setDraft(visibility);
  }, [open, visibility]);

  const toggle = (field: keyof LeadColumnVisibility, checked: boolean) => {
    setDraft((prev) => ({ ...prev, [field]: checked }));
  };

  const handleRestore = () => {
    setDraft(getDefaultColumnVisibility());
  };

  const visibleCount = LEAD_GRID_COLUMN_CONFIGS.filter(
    (c) => c.locked || draft[c.field],
  ).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Colunas da tabela</DialogTitle>
          <DialogDescription>
            Escolha quais colunas exibir na listagem de leads. Sua preferência é
            salva neste navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(50vh,360px)] space-y-1 overflow-y-auto py-1">
          {LEAD_GRID_COLUMN_CONFIGS.map((col) => (
            <label
              key={col.field}
              className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-[13px] transition-colors hover:bg-slate-50 ${
                col.locked ? "cursor-default opacity-70" : ""
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={col.locked ? true : draft[col.field]}
                disabled={col.locked}
                onChange={(e) => toggle(col.field, e.target.checked)}
              />
              <span className="text-azul-profundo">{col.label}</span>
              {col.locked && (
                <span className="text-[11px] text-slate-400">(sempre visível)</span>
              )}
            </label>
          ))}
        </div>

        <p className="text-[12px] text-slate-500">
          {visibleCount} coluna{visibleCount !== 1 ? "s" : ""} visíve
          {visibleCount !== 1 ? "is" : "l"}
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleRestore}>
            Restaurar padrão
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
