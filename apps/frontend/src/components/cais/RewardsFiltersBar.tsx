import { inputClass } from "./SlideOver";
import type { RewardsFiltersState, RewardsPaymentFilter, RewardsReferralFilter } from "@/lib/useRewardsFilters";
import type { SalesPeriod } from "@/lib/useSalesFilters";

export function RewardsFiltersBar({
  filters,
  onChange,
}: {
  filters: RewardsFiltersState;
  onChange: (patch: Partial<RewardsFiltersState>) => void;
}) {
  const selectClass = inputClass + " h-9 text-[13px]";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-[140px] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Período
        </span>
        <select
          className={selectClass}
          value={filters.period}
          onChange={(e) => onChange({ period: e.target.value as SalesPeriod })}
        >
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
          <option value="period">Período da meta</option>
        </select>
      </label>

      <label className="min-w-[150px] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Recompensas
        </span>
        <select
          className={selectClass}
          value={filters.payment}
          onChange={(e) => onChange({ payment: e.target.value as RewardsPaymentFilter })}
        >
          <option value="all">Todas</option>
          <option value="pending">Com pendências</option>
          <option value="paid">Todas pagas</option>
          <option value="not_generated">Não geradas</option>
          <option value="review">Precisam revisão</option>
        </select>
      </label>

      <label className="min-w-[140px] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Indicação
        </span>
        <select
          className={selectClass}
          value={filters.referral}
          onChange={(e) => onChange({ referral: e.target.value as RewardsReferralFilter })}
        >
          <option value="all">Todas</option>
          <option value="with">Com indicador</option>
          <option value="without">Sem indicador</option>
        </select>
      </label>

      <label className="min-w-[200px] flex-[2]">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Busca
        </span>
        <input
          type="search"
          className={selectClass}
          placeholder="Lead, telefone ou indicador…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </label>
    </div>
  );
}
