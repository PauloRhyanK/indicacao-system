import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { formatBRL, formatDate, updateSale, type Sale } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

export function PendingBoletosPanel({ sales }: { sales: Sale[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const pending = sales.filter((s) => !s.boleto_paid);

  const markPaid = useMutation({
    mutationFn: (id: string) => updateSale(id, { boleto_paid: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
    },
  });

  if (pending.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-md border border-amber-200 bg-amber-50/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-amber-900">Boletos pendentes</span>
          <Badge variant="amber">{pending.length}</Badge>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-amber-800 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="divide-y divide-amber-100 border-t border-amber-200">
          {pending.map((sale) => (
            <div
              key={sale.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-azul-profundo">
                  {sale.lead_name}
                </p>
                <p className="text-[12px] text-slate-600">
                  {formatBRL(sale.sale_value)} · {formatDate(sale.sold_at)}
                  {sale.commercial.responsavel?.name
                    ? ` · ${sale.commercial.responsavel.name}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                className="shrink-0 text-[12px] text-amber-900 hover:bg-amber-100"
                disabled={markPaid.isPending}
                onClick={() => markPaid.mutate(sale.id)}
              >
                Marcar como pago
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
