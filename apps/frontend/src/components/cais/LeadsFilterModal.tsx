import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import type { Lookups, Profile } from "@/lib/cais-api";
import type { LeadsFilters } from "@/lib/cais-api";
import {
  compileLeadFilters,
  emptyFilterRow,
  FILTER_FIELD_OPTIONS,
  type FilterField,
  type FilterOperator,
  type FilterRow,
} from "@/lib/leads-filters";

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "Contém",
  equals: "Igual a",
  before: "Antes de",
  after: "Depois de",
  between: "Entre",
  gte: "Maior ou igual",
  lte: "Menor ou igual",
};

export function LeadsFilterModal({
  open,
  onClose,
  lookups,
  profiles,
  initialRows,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  lookups: Lookups | undefined;
  profiles: Profile[] | undefined;
  initialRows: FilterRow[];
  onApply: (filters: LeadsFilters, rows: FilterRow[]) => void;
}) {
  const [rows, setRows] = useState<FilterRow[]>([emptyFilterRow()]);

  useEffect(() => {
    if (open) {
      setRows(initialRows.length > 0 ? initialRows : [emptyFilterRow()]);
    }
  }, [open, initialRows]);

  const updateRow = (id: string, patch: Partial<FilterRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.field) {
          const cfg = FILTER_FIELD_OPTIONS.find((f) => f.id === patch.field);
          next.operator = cfg?.operators[0] ?? "contains";
          next.value = "";
          next.value2 = undefined;
        }
        return next;
      }),
    );
  };

  const renderValueInput = (row: FilterRow) => {
    const cfg = FILTER_FIELD_OPTIONS.find((f) => f.id === row.field);
    if (!cfg) {
      return (
        <input className={inputClass} disabled placeholder="Selecione um campo" />
      );
    }

    if (cfg.type === "select") {
      let options: { value: string; label: string }[] = [];
      if (row.field === "status") {
        options = (lookups?.statuses ?? []).map((s) => ({ value: s.slug, label: s.name }));
      } else if (row.field === "assigned") {
        options = (profiles ?? []).map((p) => ({ value: p.id, label: p.name }));
      }
      return (
        <select
          className={inputClass}
          value={row.value}
          onChange={(e) => updateRow(row.id, { value: e.target.value })}
        >
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    const inputType = cfg.type === "date" ? "date" : cfg.type === "number" ? "number" : "text";
    return (
      <input
        type={inputType}
        className={inputClass}
        value={row.value}
        onChange={(e) => updateRow(row.id, { value: e.target.value })}
        placeholder={cfg.label}
        min={cfg.type === "number" ? "0" : undefined}
        step={cfg.type === "number" ? "0.01" : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-branco">
        <DialogHeader>
          <DialogTitle className="text-azul-profundo">Filtros avançados</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {rows.map((row) => {
            const cfg = FILTER_FIELD_OPTIONS.find((f) => f.id === row.field);
            const operators = cfg?.operators ?? ["contains"];
            const showValue2 = row.operator === "between";

            return (
              <div key={row.id} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3">
                <div className="min-w-[140px] flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Campo</label>
                  <select
                    className={inputClass}
                    value={row.field}
                    onChange={(e) =>
                      updateRow(row.id, { field: e.target.value as FilterField | "" })
                    }
                  >
                    <option value="">Selecione...</option>
                    {FILTER_FIELD_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[120px] flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Operador</label>
                  <select
                    className={inputClass}
                    value={row.operator}
                    onChange={(e) =>
                      updateRow(row.id, { operator: e.target.value as FilterOperator })
                    }
                    disabled={!row.field}
                  >
                    {operators.map((op) => (
                      <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[140px] flex-[2]">
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Valor</label>
                  {renderValueInput(row)}
                </div>
                {showValue2 && (
                  <div className="min-w-[140px] flex-[2]">
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Até</label>
                    <input
                      type={cfg?.type === "number" ? "number" : "date"}
                      className={inputClass}
                      value={row.value2 ?? ""}
                      onChange={(e) => updateRow(row.id, { value2: e.target.value })}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="mb-0.5 rounded p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  disabled={rows.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-[13px] text-azul-medio hover:text-azul-profundo"
          onClick={() => setRows((prev) => [...prev, emptyFilterRow()])}
        >
          <Plus className="h-4 w-4" /> Adicionar filtro
        </button>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Button
            variant="gold"
            onClick={() => {
              const compiled = compileLeadFilters(rows);
              onApply(compiled, rows);
              onClose();
            }}
          >
            Aplicar filtros
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const cleared = [emptyFilterRow()];
              setRows(cleared);
              onApply({}, cleared);
              onClose();
            }}
          >
            Limpar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
