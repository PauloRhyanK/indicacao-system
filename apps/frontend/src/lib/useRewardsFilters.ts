import { useMemo } from "react";
import type { MetaPeriod, PurchaseRewardsSummary } from "@/lib/cais-api";
import { businessDateKey, isSaleTodayInBusinessTz } from "@/lib/cais-api";
import type { SalesPeriod } from "@/lib/useSalesFilters";

export type RewardsPaymentFilter = "all" | "pending" | "paid" | "not_generated" | "review";
export type RewardsReferralFilter = "all" | "with" | "without";

export interface RewardsFiltersState {
  period: SalesPeriod;
  payment: RewardsPaymentFilter;
  referral: RewardsReferralFilter;
  search: string;
}

export const defaultRewardsFilters = (): RewardsFiltersState => ({
  period: "period",
  payment: "all",
  referral: "all",
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

function purchaseInPeriod(
  purchaseDate: string,
  period: SalesPeriod,
  meta: MetaPeriod | null | undefined,
): boolean {
  const key = businessDateKey(purchaseDate);
  if (period === "today") return isSaleTodayInBusinessTz(purchaseDate);
  if (period === "week") return key >= startOfWeekBusiness();
  if (period === "month") return key >= startOfMonthBusiness();
  if (period === "period" && meta) {
    const start = businessDateKey(meta.start_date);
    const end = businessDateKey(meta.end_date);
    return key >= start && key <= end;
  }
  return true;
}

export function filterRewardItems(
  items: PurchaseRewardsSummary[],
  filters: RewardsFiltersState,
  meta: MetaPeriod | null | undefined,
): PurchaseRewardsSummary[] {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (!purchaseInPeriod(item.purchaseDate, filters.period, meta)) return false;

    if (filters.payment === "not_generated" && item.rewardsGenerated) return false;
    if (filters.payment === "pending" && (!item.rewardsGenerated || item.pendingCount === 0)) {
      return false;
    }
    if (
      filters.payment === "paid" &&
      (!item.rewardsGenerated || item.pendingCount > 0 || item.totalRewards === 0)
    ) {
      return false;
    }
    if (filters.payment === "review" && item.staleCount === 0) return false;

    if (filters.referral === "with" && !item.directReferrerName) return false;
    if (filters.referral === "without" && item.directReferrerName) return false;

    if (search) {
      const hay = `${item.leadName} ${item.leadPhone ?? ""} ${item.directReferrerName ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

export function useRewardsFilterSummary(
  allItems: PurchaseRewardsSummary[] | undefined,
  filteredItems: PurchaseRewardsSummary[],
) {
  return useMemo(() => {
    const total = allItems?.length ?? 0;
    const count = filteredItems.length;
    const volume = filteredItems.reduce((s, x) => s + x.purchaseAmount, 0);
    const pending = filteredItems.filter((i) => i.rewardsGenerated && i.pendingCount > 0).length;
    return { total, count, volume, pending };
  }, [allItems, filteredItems]);
}
