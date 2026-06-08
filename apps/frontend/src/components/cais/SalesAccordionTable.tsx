import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "./Badge";
import { EmptyState, Spinner } from "./Feedback";
import { ReverseSaleDialog } from "./ReverseSaleDialog";
import { SaleExpandedPanel } from "./SaleExpandedPanel";
import { fetchSales, formatBRL, formatDate, type Sale } from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const GRID_COLS =
  "grid grid-cols-[minmax(90px,1fr)_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_72px_28px] gap-3 items-center";

function SaleRowTrigger({
  sale,
  isHighlighted,
  isExpanded,
  canDelete,
  onCancel,
}: {
  sale: Sale;
  isHighlighted: boolean;
  isExpanded: boolean;
  canDelete: boolean;
  onCancel: (sale: Sale) => void;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          GRID_COLS,
          "w-full px-4 py-3.5 text-[13px] text-left transition-colors hover:bg-slate-50/80 [&[data-state=open]_svg:last-child]:rotate-180",
          isHighlighted && "bg-ouro/5",
        )}
      >
        <span className="text-slate-600">{formatDate(sale.sold_at)}</span>
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
                  isExpanded={isExpanded}
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
