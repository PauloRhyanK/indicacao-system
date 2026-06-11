import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "./Badge";
import { EmptyState, Spinner } from "./Feedback";
import { ReverseSaleDialog } from "./ReverseSaleDialog";
import { SaleExpandedPanel } from "./SaleExpandedPanel";
import { inputClass } from "./SlideOver";
import {
  fetchSales,
  formatBRL,
  formatDate,
  updateSale,
  type Sale,
} from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const GRID_COLS =
  "grid grid-cols-[minmax(110px,1fr)_minmax(120px,2fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(100px,1fr)_72px_28px] gap-3 items-center";

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SaleRowTrigger({
  sale,
  isHighlighted,
  canEdit,
  canDelete,
  onCancel,
}: {
  sale: Sale;
  isHighlighted: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onCancel: (sale: Sale) => void;
}) {
  const qc = useQueryClient();
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(toDateInputValue(sale.sold_at));

  useEffect(() => {
    setDateValue(toDateInputValue(sale.sold_at));
  }, [sale.sold_at]);

  const updateMutation = useMutation({
    mutationFn: (patch: { sale_date?: string; boleto_paid?: boolean }) =>
      updateSale(sale.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      setEditingDate(false);
    },
  });

  const saveDate = () => {
    if (dateValue && dateValue !== toDateInputValue(sale.sold_at)) {
      updateMutation.mutate({ sale_date: dateValue });
    } else {
      setEditingDate(false);
    }
  };

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          GRID_COLS,
          "w-full px-4 py-3.5 text-[13px] text-left transition-colors hover:bg-slate-50/80 [&[data-state=open]_svg:last-child]:rotate-180",
          isHighlighted && "bg-ouro/5",
        )}
      >
        <span
          className="text-slate-600"
          onClick={(e) => {
            if (canEdit) {
              e.stopPropagation();
              setEditingDate(true);
            }
          }}
        >
          {editingDate && canEdit ? (
            <input
              type="date"
              className={inputClass + " h-8 px-2 text-[12px]"}
              value={dateValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDateValue(e.target.value)}
              onBlur={saveDate}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveDate();
                }
                if (e.key === "Escape") {
                  setEditingDate(false);
                  setDateValue(toDateInputValue(sale.sold_at));
                }
              }}
              autoFocus
            />
          ) : (
            <span className={canEdit ? "cursor-pointer hover:underline" : undefined}>
              {formatDate(sale.sold_at)}
            </span>
          )}
        </span>
        <span className="min-w-0 truncate font-medium text-azul-profundo">
          <Link
            to="/leads/$id"
            params={{ id: sale.lead_id }}
            className="hover:text-ouro hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {sale.lead_name}
          </Link>
        </span>
        <span className="font-semibold tabular-nums text-azul-profundo">
          {formatBRL(sale.sale_value)}
        </span>
        <span>
          {sale.consortium_type ? (
            <Badge variant="gray">{sale.consortium_type}</Badge>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          {canEdit ? (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={sale.boleto_paid}
                disabled={updateMutation.isPending}
                onChange={(e) =>
                  updateMutation.mutate({ boleto_paid: e.target.checked })
                }
              />
              {sale.boleto_paid ? "Pago" : "Pendente"}
            </label>
          ) : sale.boleto_paid ? (
            <Badge variant="green">Pago</Badge>
          ) : (
            <Badge variant="gray">Pendente</Badge>
          )}
        </span>
        <span>
          {canDelete ? (
            <button
              type="button"
              className="text-[12px] font-medium text-red-600 hover:text-red-700 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(sale);
              }}
            >
              Cancelar
            </button>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function SalesAccordionTable({
  highlightSaleId,
  onHighlightDone,
}: {
  highlightSaleId?: string | null;
  onHighlightDone?: () => void;
}) {
  const { can } = usePermissions();
  const canDelete = can("sales.delete");
  const canEdit = can("sales.create");

  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const [reverseTarget, setReverseTarget] = useState<Sale | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightSaleId || !sales.data?.length) return;
    if (highlightedRef.current === highlightSaleId) return;

    setExpandedId(highlightSaleId);

    const el = tableRef.current?.querySelector(`[data-sale-id="${highlightSaleId}"]`);
    if (el) {
      highlightedRef.current = highlightSaleId;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        onHighlightDone?.();
      });
    }
  }, [highlightSaleId, sales.data, onHighlightDone]);

  if (sales.isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-slate-200 bg-branco">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (sales.isError) {
    return (
      <div className="rounded-md border border-slate-200 bg-branco p-8 text-center text-[13px] text-slate-600">
        Erro ao carregar vendas.{" "}
        <button
          type="button"
          className="font-medium text-azul-profundo underline"
          onClick={() => sales.refetch()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const items = sales.data ?? [];

  if (!items.length) {
    return (
      <EmptyState
        title="Nenhuma venda registrada"
        message="Registre a primeira venda usando o formulário acima. As vendas aparecerão aqui com os detalhes comerciais e a cadeia de indicação."
      />
    );
  }

  return (
    <>
      <div
        ref={tableRef}
        className="overflow-hidden rounded-md border border-slate-200 bg-branco"
      >
        <div
          className={cn(
            GRID_COLS,
            "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500",
          )}
        >
          <span>Data</span>
          <span>Lead</span>
          <span>Valor</span>
          <span>Consórcio</span>
          <span>Boleto</span>
          {canDelete ? <span>Ações</span> : <span aria-hidden />}
          <span aria-hidden />
        </div>

        <Accordion
          type="single"
          collapsible
          value={expandedId}
          onValueChange={setExpandedId}
          className="divide-y divide-slate-100"
        >
          {items.map((sale) => {
            const isExpanded = expandedId === sale.id;
            return (
              <AccordionItem
                key={sale.id}
                value={sale.id}
                data-sale-id={sale.id}
                className="border-0"
              >
                <SaleRowTrigger
                  sale={sale}
                  isHighlighted={highlightSaleId === sale.id}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onCancel={setReverseTarget}
                />
                <AccordionContent className="p-0">
                  <SaleExpandedPanel sale={sale} enabled={isExpanded} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <ReverseSaleDialog sale={reverseTarget} onClose={() => setReverseTarget(null)} />
    </>
  );
}
