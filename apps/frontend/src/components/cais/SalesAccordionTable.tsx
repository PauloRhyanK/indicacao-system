import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "./Badge";
import { BonusChainCard } from "./BonusChainCard";
import { EmptyState, Spinner } from "./Feedback";
import {
  fetchBonusChain,
  fetchSales,
  formatBRL,
  formatDate,
  type Sale,
} from "@/lib/cais-api";
import { cn } from "@/lib/utils";

const GRID_COLS =
  "grid grid-cols-[minmax(90px,1fr)_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,0.8fr)_28px] gap-3 items-center";

function BonusChainPanel({ leadId, enabled }: { leadId: string; enabled: boolean }) {
  const chain = useQuery({
    queryKey: ["bonus-chain", leadId],
    queryFn: () => fetchBonusChain(leadId),
    enabled,
  });

  if (!enabled) return null;

  if (chain.isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[13px] text-slate-500">
        <Spinner className="h-4 w-4" />
        Carregando cadeia de bonificação…
      </div>
    );
  }

  if (chain.isError) {
    return (
      <div className="py-4 text-[13px] text-status-red">
        Não foi possível carregar a bonificação.{" "}
        <button
          type="button"
          className="font-medium text-azul-profundo underline"
          onClick={() => chain.refetch()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <BonusChainCard
      chain={chain.data?.chain ?? []}
      treeTruncated={chain.data?.tree_truncated}
      variant="table"
      showTitle={false}
    />
  );
}

function LevelsBadge({ leadId, enabled }: { leadId: string; enabled: boolean }) {
  const chain = useQuery({
    queryKey: ["bonus-chain", leadId],
    queryFn: () => fetchBonusChain(leadId),
    enabled,
  });

  if (!enabled) return <span className="text-[12px] text-slate-400">—</span>;
  if (chain.isLoading) return <Spinner className="h-4 w-4" />;

  const count = chain.data?.chain.length ?? 0;
  if (!count) return <span className="text-[12px] text-slate-400">0 níveis</span>;

  return (
    <Badge variant="gold">
      {count} {count === 1 ? "nível" : "níveis"}
    </Badge>
  );
}

function SaleRowTrigger({
  sale,
  isHighlighted,
  isExpanded,
}: {
  sale: Sale;
  isHighlighted: boolean;
  isExpanded: boolean;
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
          <LevelsBadge leadId={sale.lead_id} enabled={isExpanded} />
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
  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const [expandedId, setExpandedId] = useState<string | undefined>();
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
        message="Registre a primeira venda usando o formulário acima. As vendas aparecerão aqui com a cadeia de bonificação."
      />
    );
  }

  return (
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
        <span>Níveis</span>
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
              />
              <AccordionContent className="px-4 pb-4 pt-0">
                <BonusChainPanel leadId={sale.lead_id} enabled={isExpanded} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
