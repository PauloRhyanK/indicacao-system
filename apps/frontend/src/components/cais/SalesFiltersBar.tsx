import { inputClass } from "./SlideOver";
import type { LookupItem, Profile } from "@/lib/cais-api";
import type { BoletoFilter, SalesFiltersState, SalesPeriod } from "@/lib/useSalesFilters";

export function SalesFiltersBar({
  filters,
  onChange,
  profiles,
  consortiumTypes,
  canViewAll,
}: {
  filters: SalesFiltersState;
  onChange: (patch: Partial<SalesFiltersState>) => void;
  profiles: Profile[];
  consortiumTypes: LookupItem[];
  canViewAll: boolean;
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

      {canViewAll && filters.scope === "all" ? (
        <label className="min-w-[160px] flex-1">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Vendedor
          </span>
          <select
            className={selectClass}
            value={filters.sellerId}
            onChange={(e) => onChange({ sellerId: e.target.value })}
          >
            <option value="">Todos</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="min-w-[120px] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Boleto
        </span>
        <select
          className={selectClass}
          value={filters.boleto}
          onChange={(e) => onChange({ boleto: e.target.value as BoletoFilter })}
        >
          <option value="all">Todos</option>
          <option value="paid">Pagos</option>
          <option value="pending">Pendentes</option>
        </select>
      </label>

      <label className="min-w-[140px] flex-1">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Consórcio
        </span>
        <select
          className={selectClass}
          value={filters.consortiumTypeId}
          onChange={(e) => onChange({ consortiumTypeId: e.target.value })}
        >
          <option value="">Todos</option>
          {consortiumTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[180px] flex-[2]">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Busca
        </span>
        <input
          type="search"
          className={selectClass}
          placeholder="Lead ou telefone…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </label>
    </div>
  );
}
