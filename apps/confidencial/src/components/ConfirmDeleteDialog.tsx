import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Excluir",
  pending = false,
  error,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-slate-200 bg-branco p-0 shadow-xl">
        <AlertDialogHeader className="space-y-2 border-b border-slate-100 px-6 py-5 text-left">
          <AlertDialogTitle className="text-[18px] font-semibold text-azul-profundo">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-relaxed text-slate-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="px-6 text-[13px] text-status-red">{error}</p>
        )}

        <AlertDialogFooter className="gap-2 border-t border-slate-100 px-6 py-4 sm:justify-end">
          <AlertDialogCancel
            disabled={pending}
            className="h-9 rounded-md border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="h-9 rounded-md bg-status-red px-4 text-[13px] font-medium text-white hover:bg-red-700"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending ? "Excluindo…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
