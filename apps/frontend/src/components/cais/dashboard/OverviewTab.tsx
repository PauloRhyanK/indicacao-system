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
import { getRouteApi } from "@tanstack/react-router";
import { KPICard } from "@/components/cais/KPICard";
import { Badge } from "@/components/cais/Badge";
import { SectionHeader } from "@/components/cais/Feedback";
import {
  fetchAllLeads,
  fetchSales,
  fetchProfiles,
  fetchReferrals,
  fetchMetaPeriod,
  fetchDailyGoalToday,
  fetchLookups,
  formatBRL,
  isLeadClosed,
} from "@/lib/cais-api";
import { cn } from "@/lib/utils";

const authenticatedRoute = getRouteApi("/_authenticated");

export function OverviewTab() {
  const { user } = authenticatedRoute.useRouteContext();

  const leads = useQuery({ queryKey: ["leads-all"], queryFn: fetchAllLeads });
  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const dailyGoal = useQuery({ queryKey: ["daily-goal-today"], queryFn: fetchDailyGoalToday });
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

  const leaderboard = useMemo(() => {
    const profs = profiles.data ?? [];
    const refs = referrals.data ?? [];
    const lds = leads.data ?? [];
    const sls = sales.data ?? [];
    const leadById = new Map(lds.map((l) => [l.id, l]));
    const salesByLead = new Map<string, number>();
    sls.forEach((s) =>
      salesByLead.set(s.lead_id, (salesByLead.get(s.lead_id) ?? 0) + Number(s.sale_value)),
    );
    return profs
      .map((p) => {
        const mine = refs.filter(
          (r) => r.referrer_type === "user" && r.referrer_user_id === p.id,
        );
        const indicated = mine.length;
        const conv = mine.filter((r) => {
          const lead = leadById.get(r.lead_id ?? "");
          return lead && isLeadClosed(lead);
        }).length;
        const vol = mine.reduce(
          (sum, r) => sum + (salesByLead.get(r.lead_id ?? "") ?? 0),
          0,
        );
        return { id: p.id, name: p.name, indicated, conv, vol };
      })
      .sort((a, b) => b.conv - a.conv || b.vol - a.vol);
  }, [profiles.data, referrals.data, leads.data, sales.data]);

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

      <div className="rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Top Indicadores do Mês</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {["Rank", "Nome", "Leads Indicados", "Convertidos", "Volume Gerado"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-azul-profundo"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => {
                const isMe = row.id === user.id;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50",
                      isMe && "bg-ouro/10 ring-1 ring-inset ring-ouro/40",
                    )}
                  >
                    <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                      {i === 0 ? (
                        <Badge variant="gold">🏅 #1</Badge>
                      ) : (
                        <Badge variant={isMe ? "gold" : "gray"}>#{i + 1}</Badge>
                      )}
                    </td>
                    <td
                      className={cn(
                        "border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium",
                        isMe ? "text-azul-profundo" : "text-azul-profundo",
                      )}
                    >
                      {row.name}
                      {isMe && (
                        <span className="ml-2 text-[11px] font-normal text-ouro-escuro">(você)</span>
                      )}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] tabular-nums">
                      {row.indicated}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] tabular-nums">
                      {row.conv}
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] tabular-nums">
                      {formatBRL(row.vol)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
