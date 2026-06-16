import { useMemo } from "react";
import type { MetaPeriod, Sale } from "@/lib/cais-api";
import { businessDateKey, isSaleTodayInBusinessTz } from "@/lib/cais-api";

export type SalesScope = "mine" | "all";
export type SalesPeriod = "today" | "week" | "month" | "period";
export type BoletoFilter = "all" | "paid" | "pending";

export interface SalesFiltersState {
  scope: SalesScope;
  period: SalesPeriod;
  sellerId: string;
  boleto: BoletoFilter;
  consortiumTypeId: string;
  search: string;
}

export const defaultSalesFilters = (currentUserId?: string): SalesFiltersState => ({
  scope: "mine",
  period: "period",
  sellerId: currentUserId ?? "",
  boleto: "all",
  consortiumTypeId: "",
  search: "",
});

function startOfWeekBusiness(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = map[weekday] ?? 1;
  const offset = day === 0 ? 6 : day - 1;
  const d = new Date(now);
  d.setDate(d.getDate() - offset);
  return businessDateKey(d);
}

function startOfMonthBusiness(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}-01`;
}

function saleInPeriod(sale: Sale, period: SalesPeriod, meta: MetaPeriod | null | undefined): boolean {
  const key = businessDateKey(sale.sold_at);
  if (period === "today") return isSaleTodayInBusinessTz(sale.sold_at);
  if (period === "week") return key >= startOfWeekBusiness();
  if (period === "month") return key >= startOfMonthBusiness();
  if (period === "period" && meta) {
    const start = businessDateKey(meta.start_date);
    const end = businessDateKey(meta.end_date);
    return key >= start && key <= end;
  }
  return true;
}

export function filterSales(
  sales: Sale[],
  filters: SalesFiltersState,
  currentUserId: string | undefined,
  meta: MetaPeriod | null | undefined,
): Sale[] {
  const search = filters.search.trim().toLowerCase();

  return sales.filter((sale) => {
    if (filters.scope === "mine" && currentUserId) {
      if (sale.commercial.responsavel?.id !== currentUserId) return false;
    }

    if (filters.sellerId && sale.commercial.responsavel?.id !== filters.sellerId) {
      return false;
    }

    if (!saleInPeriod(sale, filters.period, meta)) return false;

    if (filters.boleto === "paid" && !sale.boleto_paid) return false;
    if (filters.boleto === "pending" && sale.boleto_paid) return false;

    if (filters.consortiumTypeId && sale.consortium_type_id !== filters.consortiumTypeId) {
      return false;
    }

    if (search) {
      const hay = `${sale.lead_name} ${sale.lead_phone ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

export function useSalesFilterSummary(
  allSales: Sale[] | undefined,
  filteredSales: Sale[],
) {
  return useMemo(() => {
    const total = allSales?.length ?? 0;
    const count = filteredSales.length;
    const volume = filteredSales.reduce((s, x) => s + x.sale_value, 0);
    return { total, count, volume };
  }, [allSales, filteredSales]);
}
