import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { KPICard } from "@/components/cais/KPICard";
import { SectionHeader } from "@/components/cais/Feedback";
import {
  RecentSalesPanel,
  SalesRankingPanel,
} from "@/components/cais/dashboard/SalesPanels";
import {
  fetchAllLeads,
  fetchMetaPeriod,
  fetchDailyGoalToday,
  fetchLookups,
  formatBRL,
  isLeadClosed,
} from "@/lib/cais-api";

export function OverviewTab() {
  const leads = useQuery({ queryKey: ["leads-all"], queryFn: fetchAllLeads });
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const dailyGoal = useQuery({
    queryKey: ["daily-goal-today"],
    queryFn: fetchDailyGoalToday,
    refetchInterval: 30_000,
  });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });

  const [progressW, setProgressW] = useState(0);
  const [dailyProgressW, setDailyProgressW] = useState(0);

  const volume = meta.data?.current_value ?? 0;
  const target = meta.data?.target_value ?? 0;
  const pct = target ? Math.min(100, (volume / target) * 100) : 0;

  const dailyTarget = dailyGoal.data?.target ?? 0;
  const dailyCurrent = dailyGoal.data?.current ?? 0;
  const dailyPct = dailyGoal.data?.percent ?? 0;

  useEffect(() => {
    const t = setTimeout(() => setProgressW(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  useEffect(() => {
    const t = setTimeout(() => setDailyProgressW(dailyPct), 150);
    return () => clearTimeout(t);
  }, [dailyPct]);

  const total = leads.data?.length ?? 0;
  const converted = (leads.data ?? []).filter(isLeadClosed).length;
  const convRate = total ? ((converted / total) * 100).toFixed(1) : "0.0";

  const funnelData = useMemo(() => {
    const statuses = lookups.data?.statuses ?? [];
    return statuses.map((s) => ({
      status: s.name,
      count: (leads.data ?? []).filter((l) => l.salesStatus?.slug === s.slug).length,
    }));
  }, [leads.data, lookups.data]);

  const salesRanking = useMemo(
    () =>
      (dailyGoal.data?.salesRanking ?? []).map((r) => ({
        position: r.position,
        name: r.name,
        total: r.total,
        count: r.count,
      })),
    [dailyGoal.data?.salesRanking],
  );

  const recentSales = dailyGoal.data?.recentSales ?? [];

  return (
    <>
      <div className="mb-8 rounded-lg border-l-[3px] border-ouro bg-slate-50 px-[22px] py-[18px]">
        <SectionHeader>Meta do Período</SectionHeader>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-ouro transition-[width] duration-1000 ease-out"
            style={{ width: `${progressW}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[13px] text-slate-700">
            {formatBRL(volume)} de {formatBRL(target)}
          </span>
          <span className="text-[13px] font-semibold text-azul-profundo">
            {pct.toFixed(1)}%
          </span>
        </div>
        {meta.data && (
          <div className="mt-1 text-[11px] text-slate-500">{meta.data.period_label}</div>
        )}
      </div>

      <div className="mb-8 rounded-lg border-l-[3px] border-azul-medio bg-slate-50 px-[22px] py-[18px]">
        <SectionHeader>Meta do Dia (empresa)</SectionHeader>
        {dailyTarget > 0 ? (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-azul-medio transition-[width] duration-1000 ease-out"
                style={{ width: `${dailyProgressW}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] text-slate-700">
                {formatBRL(dailyCurrent)} de {formatBRL(dailyTarget)}
              </span>
              <span className="text-[13px] font-semibold text-azul-profundo">
                {dailyPct.toFixed(1)}%
              </span>
            </div>
          </>
        ) : (
          <div className="mt-1">
            <p className="text-[22px] font-semibold text-azul-profundo">{formatBRL(dailyCurrent)}</p>
            <p className="mt-1 text-[13px] text-slate-500">
              {dailyCurrent > 0 ? "vendido hoje · sem meta definida" : "sem meta definida · nenhuma venda hoje"}
            </p>
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total de Leads" value={total} sub="No período" />
        <KPICard
          label="Convertidos"
          value={converted}
          valueClassName="text-status-green"
          sub="Leads fechados"
        />
        <KPICard label="Taxa de Conversão" value={`${convRate}%`} sub="Convertidos / Total" />
        <KPICard label="Volume Vendido" value={formatBRL(volume)} sub="Soma das vendas" />
      </div>

      <div className="mb-8 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Funil de Conversão</SectionHeader>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DFE7" vertical={false} />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 11, fill: "#5C6B7A" }}
                axisLine={{ stroke: "#D8DFE7" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#5C6B7A" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #D8DFE7",
                }}
                cursor={{ fill: "rgba(217,189,126,0.08)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill="#d9bd7e" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesRankingPanel title="Ranking Geral" entries={salesRanking} />
        <RecentSalesPanel sales={recentSales} />
      </div>
    </>
  );
}
