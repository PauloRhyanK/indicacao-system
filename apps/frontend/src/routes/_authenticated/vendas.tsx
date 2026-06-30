import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import { PendingBoletosPanel } from "@/components/cais/PendingBoletosPanel";
import { SaleCelebrationModal } from "@/components/cais/SaleCelebrationModal";
import { SaleRegistrationDrawer } from "@/components/cais/SaleRegistrationDrawer";
import { SalesAccordionTable } from "@/components/cais/SalesAccordionTable";
import { ExportSalesDialog } from "@/components/cais/ExportSalesDialog";
import { SalesFiltersBar } from "@/components/cais/SalesFiltersBar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchLookups,
  fetchMetaPeriod,
  fetchProfiles,
  fetchSales,
  isSaleTodayInBusinessTz,
} from "@/lib/cais-api";
import { fetchMe } from "@/lib/api/auth";
import {
  defaultSalesFilters,
  filterSales,
  useSalesFilterSummary,
  type SalesFiltersState,
  type SalesScope,
} from "@/lib/useSalesFilters";
import { usePermissions } from "@/lib/use-permissions";
import type { SaleRegistrationResult } from "@/components/cais/SaleRegistrationForm";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({ meta: [{ title: "Registrar Venda — CAIS" }] }),
  component: VendasPage,
});

function VendasPage() {
  const { can } = usePermissions();
  const canViewAll = can("sales.view_all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [highlightSaleId, setHighlightSaleId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<SaleRegistrationResult | null>(null);

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });

  const currentUserId = me.data?.user.id;

  const [filters, setFilters] = useState<SalesFiltersState>(() =>
    defaultSalesFilters(undefined),
  );

  useEffect(() => {
    if (!currentUserId) return;
    setFilters((f) =>
      f.scope === "mine" && f.sellerId !== currentUserId
        ? { ...f, sellerId: currentUserId }
        : f,
    );
  }, [currentUserId]);

  const handleScopeChange = (scope: SalesScope) => {
    setFilters((f) => ({
      ...f,
      scope,
      sellerId: scope === "mine" && currentUserId ? currentUserId : "",
    }));
  };

  const patchFilters = (patch: Partial<SalesFiltersState>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const filteredSales = useMemo(
    () => filterSales(sales.data ?? [], filters, currentUserId, meta.data),
    [sales.data, filters, currentUserId, meta.data],
  );

  const summary = useSalesFilterSummary(sales.data, filteredSales);

  const scopeLabel = filters.scope === "mine" ? "Minhas vendas" : "Todas as vendas";

  const todayHint = useMemo(() => {
    if (filters.scope !== "mine" || filters.period !== "today" || !currentUserId) return null;
    const count = (sales.data ?? []).filter(
      (s) =>
        s.commercial.responsavel?.id === currentUserId && isSaleTodayInBusinessTz(s.sold_at),
    ).length;
    if (count === 0) return null;
    return `${count} venda${count !== 1 ? "s" : ""} sua${count !== 1 ? "s" : ""} hoje nesta base`;
  }, [sales.data, filters.scope, filters.period, currentUserId]);

  const handleRegistered = (result: SaleRegistrationResult) => {
    setCelebration(result);
    setHighlightSaleId(result.purchaseId);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold text-azul-profundo">Vendas</h1>
          <p className="text-[14px] text-slate-500">
            Registre vendas, filtre o histórico e acompanhe boletos pendentes.
          </p>
          {todayHint ? (
            <p className="mt-1 text-[12px] text-slate-500">{todayHint}</p>
          ) : null}
        </div>
        <Link
          to="/dashboard"
          className="text-[13px] font-medium text-azul-medio hover:text-azul-profundo"
        >
          Ver meu desempenho no Dashboard →
        </Link>
      </div>

      <PendingBoletosPanel sales={filteredSales} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filters.scope}
          onValueChange={(v) => handleScopeChange(v as SalesScope)}
        >
          <TabsList className="h-9">
            <TabsTrigger value="mine" className="text-[13px]">
              Minhas vendas
            </TabsTrigger>
            {canViewAll ? (
              <TabsTrigger value="all" className="text-[13px]">
                Todas as vendas
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setExportDialogOpen(true)}>
            Exportar
          </Button>

          <Button
            variant="gold"
            className="inline-flex items-center gap-2"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar nova venda
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-branco p-4">
        <SalesFiltersBar
          filters={filters}
          onChange={patchFilters}
          profiles={profiles.data ?? []}
          consortiumTypes={lookups.data?.consortiumTypes ?? []}
          canViewAll={canViewAll}
        />
      </div>

      <SalesAccordionTable
        sales={filteredSales}
        isLoading={sales.isLoading}
        isError={sales.isError}
        onRetry={() => sales.refetch()}
        highlightSaleId={highlightSaleId}
        onHighlightDone={() => setHighlightSaleId(null)}
        summary={{
          count: summary.count,
          total: summary.total,
          volume: summary.volume,
        }}
        scopeLabel={scopeLabel}
      />

      <SaleRegistrationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRegistered={handleRegistered}
      />

      <SaleCelebrationModal
        open={!!celebration}
        result={celebration}
        leadName={celebration?.leadName}
        saleValue={celebration?.saleValue}
        onClose={() => setCelebration(null)}
      />

      <ExportSalesDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        sales={filteredSales}
      />
    </AppLayout>
  );
}
