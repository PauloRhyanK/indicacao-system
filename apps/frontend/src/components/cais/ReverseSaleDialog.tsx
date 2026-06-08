import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./Button";
import { Field, inputClass } from "./SlideOver";
import { deleteSale, fetchLookups, fetchSales, formatBRL, formatDate, type Sale } from "@/lib/cais-api";

export function ReverseSaleDialog({
  sale,
  onClose,
}: {
  sale: Sale | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const open = !!sale;

  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const allSales = useQuery({ queryKey: ["sales"], queryFn: fetchSales, enabled: open });

  const [statusSlug, setStatusSlug] = useState("em-negociacao");

  const isLastSale = useMemo(() => {
    if (!sale || !allSales.data) return false;
    return allSales.data.filter((s) => s.lead_id === sale.lead_id).length === 1;
  }, [sale, allSales.data]);

  useEffect(() => {
    if (open) setStatusSlug("em-negociacao");
  }, [open, sale?.id]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!sale) throw new Error("Venda não selecionada");
      return deleteSale(sale.id, { leadStatusSlug: statusSlug });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (sale) {
        qc.invalidateQueries({ queryKey: ["lead", sale.lead_id] });
      }
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md border-slate-200 bg-branco sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-azul-profundo">
            Cancelar venda
          </DialogTitle>
          <DialogDescription className="text-[13px] text-slate-500">
            A meta e o valor fechado serão revertidos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="space-y-4 text-[13px]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Data</dt>
                <dd className="font-medium text-azul-profundo">{formatDate(sale.sold_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Valor</dt>
                <dd className="font-semibold tabular-nums text-azul-profundo">
                  {formatBRL(sale.sale_value)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Lead</dt>
                <dd className="font-medium text-azul-profundo">{sale.lead_name}</dd>
              </div>
              {sale.consortium_type && (
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Consórcio</dt>
                  <dd className="text-azul-profundo">{sale.consortium_type}</dd>
                </div>
              )}
            </dl>

            {isLastSale ? (
              <Field label="Status do lead após cancelamento">
                <select
                  className={inputClass}
                  value={statusSlug}
                  onChange={(e) => setStatusSlug(e.target.value)}
                  disabled={mutation.isPending}
                >
                  {(lookups.data?.statuses ?? []).map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Este lead ainda possui outras vendas registradas. O status permanecerá como{" "}
                <strong>Fechado</strong>.
              </p>
            )}

            {mutation.isError && (
              <p className="text-[12px] text-status-red">
                Não foi possível cancelar a venda. Tente novamente.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-branco hover:bg-red-700"
            disabled={mutation.isPending || !sale}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cancelando…" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
