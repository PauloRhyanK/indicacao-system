import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import { registerSale } from "@/lib/cais-api";

export function RegisterSaleDialog({
  open,
  onClose,
  leadId,
  leadName,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      registerSale({
        lead_id: leadId,
        sale_value: Number(value),
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      setValue("");
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-azul-profundo/40 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg border border-slate-200 bg-branco p-6 shadow-xl">
        <h2 className="text-[16px] font-semibold text-azul-profundo">Registrar Venda</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Lead: <span className="font-medium text-azul-profundo">{leadName}</span>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(value) > 0) mutation.mutate();
          }}
          className="mt-4"
        >
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Valor da venda (R$)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            O lead será marcado como <strong>Convertido</strong> automaticamente.
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="submit" variant="gold" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Confirmar Venda"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
