import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { EditLeadFields, type EditLeadFieldsHandle } from "./EditLeadFields";
import { Spinner } from "./Feedback";
import { Field, inputClass, SlideOver } from "./SlideOver";
import {
  businessDateKey,
  fetchLead,
  formatBRL,
  updateSale,
  type Sale,
} from "@/lib/cais-api";

function toDateInputValue(iso: string): string {
  return businessDateKey(iso);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b border-slate-100 pb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

export function SaleEditDrawer({
  sale,
  open,
  onClose,
  canEditSale,
  canEditLead,
}: {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
  canEditSale: boolean;
  canEditLead: boolean;
}) {
  const qc = useQueryClient();
  const leadFieldsRef = useRef<EditLeadFieldsHandle>(null);

  const lead = useQuery({
    queryKey: ["lead", sale?.lead_id],
    queryFn: () => fetchLead(sale!.lead_id),
    enabled: open && !!sale?.lead_id,
  });

  const [saleDate, setSaleDate] = useState("");
  const [boletoPaid, setBoletoPaid] = useState(false);

  useEffect(() => {
    if (!sale || !open) return;
    setSaleDate(toDateInputValue(sale.sold_at));
    setBoletoPaid(sale.boleto_paid);
  }, [sale, open]);

  const saleDirty =
    !!sale &&
    canEditSale &&
    (saleDate !== toDateInputValue(sale.sold_at) || boletoPaid !== sale.boleto_paid);

  const saleMutation = useMutation({
    mutationFn: () => {
      if (!sale) throw new Error("Venda não selecionada");
      const patch: { sale_date?: string; boleto_paid?: boolean } = {};
      if (saleDate !== toDateInputValue(sale.sold_at)) patch.sale_date = saleDate;
      if (boletoPaid !== sale.boleto_paid) patch.boleto_paid = boletoPaid;
      return updateSale(sale.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      qc.invalidateQueries({ queryKey: ["personal-dashboard"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    try {
      const tasks: Promise<unknown>[] = [];
      if (saleDirty) tasks.push(saleMutation.mutateAsync());
      if (canEditLead && leadFieldsRef.current?.isDirty()) {
        tasks.push(leadFieldsRef.current.submit());
      }
      if (tasks.length === 0) {
        onClose();
        return;
      }
      await Promise.all(tasks);
      onClose();
    } catch {
      // erros exibidos nos blocos do formulário
    }
  };

  const isPending = saleMutation.isPending;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={sale ? sale.lead_name : "Editar venda"}
      maxWidthClass="max-w-lg"
    >
      {!sale ? null : lead.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : lead.isError || !lead.data ? (
        <p className="text-[13px] text-status-red">Não foi possível carregar o lead.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <SectionTitle>Venda</SectionTitle>

          <div className="mb-4 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                Valor
              </span>
              <span className="font-semibold text-azul-profundo">
                {formatBRL(sale.sale_value)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                Vendedor
              </span>
              <span className="text-slate-700">
                {sale.commercial.responsavel?.name ?? "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                Consórcio
              </span>
              <span className="text-slate-700">{sale.consortium_type ?? "—"}</span>
            </div>
          </div>

          <Field label="Data da venda">
            <input
              type="date"
              disabled={!canEditSale || isPending}
              className={inputClass}
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </Field>

          <Field label="Boleto">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                disabled={!canEditSale || isPending}
                checked={boletoPaid}
                onChange={(e) => setBoletoPaid(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-azul-profundo focus:ring-ouro/30"
              />
              Marcado como pago
            </label>
          </Field>

          {saleMutation.isError && (
            <p className="mb-3 text-[12px] text-status-red">
              Erro ao salvar venda. Tente novamente.
            </p>
          )}

          <div className="mt-8">
            <SectionTitle>Informações do lead</SectionTitle>
            <EditLeadFields
              ref={leadFieldsRef}
              lead={lead.data}
              enabled={open}
              readOnly={!canEditLead}
            />
          </div>

          <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t border-slate-200 bg-branco px-6 py-4">
            <Button
              type="submit"
              variant="gold"
              disabled={isPending || (!canEditSale && !canEditLead)}
            >
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </SlideOver>
  );
}
