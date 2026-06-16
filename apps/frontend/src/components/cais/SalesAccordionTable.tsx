import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ArrowDown, ArrowUp, Pencil, Trash2, UserRound } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "./Badge";
import { EmptyState, Spinner } from "./Feedback";
import { ReverseSaleDialog } from "./ReverseSaleDialog";
import { SaleEditDrawer } from "./SaleEditDrawer";
import { SaleExpandedPanel } from "./SaleExpandedPanel";
import { formatBRL, formatDate, type Sale } from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const GRID_COLS =
  "grid grid-cols-[minmax(96px,1fr)_minmax(110px,1.4fr)_minmax(90px,1fr)_minmax(88px,1fr)_minmax(80px,1fr)_minmax(72px,0.9fr)_minmax(96px,auto)] gap-2 items-center";

const actionBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-azul-profundo disabled:pointer-events-none disabled:opacity-35";

export type SaleSortColumn =
  | "sold_at"
  | "lead_name"
  | "seller"
  | "sale_value"
  | "consortium_type"
  | "boleto_paid";

type SortDir = "asc" | "desc";

function sortSales(sales: Sale[], column: SaleSortColumn, dir: SortDir): Sale[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...sales].sort((a, b) => {
    switch (column) {
      case "sold_at":
        return mul * (new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime());
      case "lead_name":
        return mul * a.lead_name.localeCompare(b.lead_name, "pt-BR");
      case "seller":
        return (
          mul *
          (a.commercial.responsavel?.name ?? "").localeCompare(
            b.commercial.responsavel?.name ?? "",
            "pt-BR",
          )
        );
      case "sale_value":
        return mul * (a.sale_value - b.sale_value);
      case "consortium_type":
        return mul * (a.consortium_type ?? "").localeCompare(b.consortium_type ?? "", "pt-BR");
      case "boleto_paid":
        return mul * (Number(a.boleto_paid) - Number(b.boleto_paid));
      default:
        return 0;
    }
  });
}

function SaleRowTrigger({
  sale,
  isHighlighted,
  canDelete,
  canEdit,
  onCancel,
  onEdit,
}: {
  sale: Sale;
  isHighlighted: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onCancel: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
}) {
  const pending = !sale.boleto_paid;
  const stopRow = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            GRID_COLS,
            "w-full border-l-[3px] px-4 py-3.5 text-left text-[13px] transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-medio/40 data-[state=open]:bg-slate-50/60",
            pending ? "border-l-amber-400 bg-amber-50/40" : "border-l-transparent",
            isHighlighted && "bg-ouro/5",
          )}
        >
          <span className="text-slate-600">{formatDate(sale.sold_at)}</span>
          <span className="min-w-0 truncate font-medium text-azul-profundo">{sale.lead_name}</span>
          <span className="min-w-0 truncate text-[12px] text-slate-600">
            {sale.commercial.responsavel?.name ?? "—"}
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
            <Badge variant={sale.boleto_paid ? "green" : "amber"}>
              {sale.boleto_paid ? "Pago" : "Pendente"}
            </Badge>
          </span>
          <span className="flex items-center justify-end gap-0.5" onClick={stopRow}>
            {canEdit ? (
              <button
                type="button"
                title="Editar venda e lead"
                aria-label="Editar venda e lead"
                className={actionBtnClass}
                onClick={() => onEdit(sale)}
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}

            <Link
              to="/leads/$id"
              params={{ id: sale.lead_id }}
              title="Ver lead"
              aria-label={`Ver lead ${sale.lead_name}`}
              className={actionBtnClass}
            >
              <UserRound className="h-4 w-4" />
            </Link>

            <button
              type="button"
              title={canDelete ? "Desfazer venda" : "Sem permissão para cancelar vendas"}
              aria-label="Desfazer venda"
              disabled={!canDelete}
              className={cn(
                actionBtnClass,
                canDelete && "hover:bg-red-50 hover:text-red-600",
              )}
              onClick={() => onCancel(sale)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        </button>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: SaleSortColumn;
  sort: { column: SaleSortColumn; dir: SortDir };
  onSort: (column: SaleSortColumn) => void;
  className?: string;
}) {
  const active = sort.column === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "inline-flex items-center gap-1 text-left transition-colors hover:text-azul-profundo",
        active && "text-azul-profundo",
        className,
      )}
    >
      <span>{label}</span>
      {active ? (
        sort.dir === "asc" ? (
          <ArrowUp className="h-3 w-3 shrink-0" />
        ) : (
          <ArrowDown className="h-3 w-3 shrink-0" />
        )
      ) : null}
    </button>
  );
}

export function SalesAccordionTable({
  sales,
  isLoading,
  isError,
  onRetry,
  highlightSaleId,
  onHighlightDone,
  summary,
  scopeLabel,
}: {
  sales: Sale[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  highlightSaleId?: string | null;
  onHighlightDone?: () => void;
  summary?: { count: number; total: number; volume: number };
  scopeLabel?: string;
}) {
  const { can, canAny } = usePermissions();
  const canDelete = can("sales.delete");
  const canEditSale = can("sales.create");
  const canEditLead = canAny("leads.edit_all", "leads.edit_own");
  const canEdit = canEditSale || canEditLead;

  const [sort, setSort] = useState<{ column: SaleSortColumn; dir: SortDir }>({
    column: "sold_at",
    dir: "desc",
  });
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const [reverseTarget, setReverseTarget] = useState<Sale | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<string | null>(null);

  const sortedSales = useMemo(
    () => sortSales(sales, sort.column, sort.dir),
    [sales, sort],
  );

  const handleSort = (column: SaleSortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column, dir: column === "sold_at" || column === "sale_value" ? "desc" : "asc" },
    );
  };

  useEffect(() => {
    if (!highlightSaleId || !sales.length) return;
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
  }, [highlightSaleId, sales, onHighlightDone]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-slate-200 bg-branco">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-slate-200 bg-branco p-8 text-center text-[13px] text-slate-600">
        Erro ao carregar vendas.{" "}
        <button
          type="button"
          className="font-medium text-azul-profundo underline"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!sales.length) {
    return (
      <EmptyState
        title="Nenhuma venda neste filtro"
        message="Ajuste os filtros ou registre uma nova venda. O desempenho pessoal está no Dashboard."
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
          <SortableHeader label="Data" column="sold_at" sort={sort} onSort={handleSort} />
          <SortableHeader label="Lead" column="lead_name" sort={sort} onSort={handleSort} />
          <SortableHeader label="Vendedor" column="seller" sort={sort} onSort={handleSort} />
          <SortableHeader label="Valor" column="sale_value" sort={sort} onSort={handleSort} />
          <SortableHeader label="Consórcio" column="consortium_type" sort={sort} onSort={handleSort} />
          <SortableHeader label="Boleto" column="boleto_paid" sort={sort} onSort={handleSort} />
          <span className="text-right">Ações</span>
        </div>

        <Accordion
          type="single"
          collapsible
          value={expandedId}
          onValueChange={setExpandedId}
          className="divide-y divide-slate-100"
        >
          {sortedSales.map((sale) => {
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
                  onEdit={setEditSale}
                />
                <AccordionContent className="p-0">
                  <SaleExpandedPanel
                    sale={sale}
                    enabled={isExpanded}
                    canDelete={canDelete}
                    onCancel={() => setReverseTarget(sale)}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {summary ? (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
            {scopeLabel ? <span className="font-medium text-azul-profundo">{scopeLabel}</span> : null}
            {scopeLabel ? " · " : null}
            Mostrando {summary.count} de {summary.total} vendas — {formatBRL(summary.volume)}{" "}
            filtrado
          </div>
        ) : null}
      </div>

      <ReverseSaleDialog sale={reverseTarget} onClose={() => setReverseTarget(null)} />

      <SaleEditDrawer
        sale={editSale}
        open={!!editSale}
        onClose={() => setEditSale(null)}
        canEditSale={canEditSale}
        canEditLead={canEditLead}
      />
    </>
  );
}
