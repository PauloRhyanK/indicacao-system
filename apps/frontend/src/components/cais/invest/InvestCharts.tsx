import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  investFaixaDistribution,
  investFunnelStages,
  investTrendByMonth,
  formatBRLCompact,
  type InvestLead,
} from "@/lib/invest-api";

const CARD = "rounded-md border border-slate-200 bg-branco p-4";
const TITLE =
  "mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.6px] text-ouro-escuro";

function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`;
}

/** Donut do pipe ativo por faixa + legenda com nº e ponderado. */
export function InvestFaixaDonut({ leads }: { leads: InvestLead[] }) {
  const dist = investFaixaDistribution(leads);
  const data = dist.filter((d) => d.total > 0);
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className={CARD}>
      <h3 className={TITLE}>
        Pipe por faixa
        <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
          Digital · Private · Wealth
        </span>
      </h3>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Sem leads ativos com faixa.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.faixa} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRLCompact(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Pipe</span>
              <span className="text-[15px] font-semibold text-azul-profundo">
                {formatBRLCompact(total)}
              </span>
            </div>
          </div>
          <ul className="min-w-[190px] flex-1 space-y-2">
            {dist.map((d) => (
              <li key={d.faixa} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                <span className="font-medium text-azul-profundo">{d.label}</span>
                <span className="text-xs text-slate-400">{d.count}</span>
                <span className="ml-auto text-right">
                  <span className="tabular-nums font-semibold text-ouro-escuro">
                    {formatBRLCompact(d.total)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    pond. {formatBRLCompact(d.ponderado)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Funil visual das etapas abertas + taxa de conversão. */
export function InvestFunnelChart({
  leads,
  winRate,
}: {
  leads: InvestLead[];
  winRate: number | null;
}) {
  const stages = investFunnelStages(leads).map((s) => ({ ...s, name: s.label }));
  const hasData = stages.some((s) => s.count > 0);

  return (
    <div className={CARD}>
      <h3 className={TITLE}>
        Funil de conversão
        {winRate !== null && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-emerald-700">
            {winRate.toFixed(0)}% conversão
          </span>
        )}
      </h3>
      {!hasData ? (
        <p className="py-10 text-center text-sm text-slate-400">Sem leads ativos.</p>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip formatter={(v: number) => `${v} leads`} />
              <Funnel dataKey="count" data={stages} isAnimationActive>
                {stages.map((s) => (
                  <Cell key={s.etapa} fill={s.color} />
                ))}
                <LabelList
                  position="right"
                  fill="#334155"
                  stroke="none"
                  dataKey="label"
                  className="text-[11px]"
                />
                <LabelList
                  position="left"
                  fill="#64748b"
                  stroke="none"
                  dataKey="count"
                  className="text-[11px] tabular-nums"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Tendência: leads captados vs clientes ganhos por mês. */
export function InvestTrendChart({ leads }: { leads: InvestLead[] }) {
  const raw = investTrendByMonth(leads);
  const data = raw.map((r) => ({ ...r, mesLabel: mesLabel(r.mes) }));

  return (
    <div className={CARD}>
      <h3 className={TITLE}>
        Tendência mensal
        <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
          captados × ganhos
        </span>
      </h3>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Ainda sem histórico.</p>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="captados" name="Captados" fill="#7ba7bc" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ganhos" name="Ganhos" fill="#2f8f5b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
