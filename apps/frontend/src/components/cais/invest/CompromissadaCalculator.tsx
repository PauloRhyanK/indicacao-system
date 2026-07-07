import { useMemo, useState } from "react";

// Porta da calculadora_compromissada_pj.html — mesmas fórmulas de IOF/IR e rendimento.
// IOF regressivo (idx = dias corridos; 30+ = 0).
const IOF = [
  0, 96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23,
  20, 16, 13, 10, 6, 3, 0,
];
function iofPct(d: number): number {
  return d >= 30 ? 0 : IOF[Math.max(1, Math.min(29, d))];
}
function aliqIR(d: number): number {
  return d <= 180 ? 22.5 : d <= 360 ? 20 : d <= 720 ? 17.5 : 15;
}
/** Dias úteis aproximados a partir dos dias corridos. */
function du(d: number): number {
  return Math.max(1, Math.round((d * 252) / 365));
}
/** Rendimento líquido (após IOF e IR) de um valor V no período. */
function netYield(
  V: number,
  pctCDI: number,
  cdiAA: number,
  dCorr: number,
  hasIOF: boolean,
): number {
  const daily = Math.pow(1 + cdiAA / 100, 1 / 252) - 1;
  const gross = V * (Math.pow(1 + (daily * pctCDI) / 100, du(dCorr)) - 1);
  const iof = hasIOF ? (gross * iofPct(dCorr)) / 100 : 0;
  const ir = ((gross - iof) * aliqIR(dCorr)) / 100;
  return gross - iof - ir;
}

// Slider log entre 200 mil e 200 MM (igual ao HTML).
const MIN_V = 200_000;
const MAX_V = 200_000_000;
const sliderToV = (t: number) => MIN_V * Math.pow(MAX_V / MIN_V, t / 100);
const vToSlider = (v: number) => (100 * Math.log(v / MIN_V)) / Math.log(MAX_V / MIN_V);

function fmt(n: number): string {
  return "R$ " + Math.round(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function fmt2(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Kpi({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-branco p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-[18px] font-semibold text-azul-profundo">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{foot}</div>
    </div>
  );
}

export function CompromissadaCalculator({ caixaInicial }: { caixaInicial?: number }) {
  const [caixa, setCaixa] = useState<number>(
    caixaInicial && caixaInicial >= MIN_V ? Math.min(caixaInicial, MAX_V) : 5_000_000,
  );
  const [dias, setDias] = useState<number>(15);
  const [cdi, setCdi] = useState<number>(14.15);
  const [tier1, setTier1] = useState<number>(85); // % CDI até 30 MM
  const [tier2, setTier2] = useState<number>(90); // % CDI acima de 30 MM
  const [corte, setCorte] = useState<number>(30_000_000);
  const [cdbPct, setCdbPct] = useState<number>(100);

  const r = useMemo(() => {
    const pctCompr = caixa >= corte ? tier2 : tier1;
    const comprPeriodo = netYield(caixa, pctCompr, cdi, dias, false);
    const cdbPeriodo = netYield(caixa, cdbPct, cdi, dias, true);
    const comprMes = netYield(caixa, pctCompr, cdi, 30, false);
    const porDiaUtil = comprPeriodo / du(dias);
    const vencedor = comprPeriodo >= cdbPeriodo ? "compr" : "cdb";
    const dif = Math.abs(comprPeriodo - cdbPeriodo);
    return { pctCompr, comprPeriodo, cdbPeriodo, comprMes, porDiaUtil, vencedor, dif };
  }, [caixa, dias, cdi, tier1, tier2, corte, cdbPct]);

  const maxBar = Math.max(r.comprPeriodo, r.cdbPeriodo, 1);

  return (
    <div className="space-y-4">
      {/* Controles principais */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Caixa da empresa
            </label>
            <span className="font-mono text-[15px] font-semibold text-azul-profundo">
              {fmt(caixa)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={vToSlider(caixa)}
            onChange={(e) => setCaixa(Math.round(sliderToV(Number(e.target.value))))}
            className="mt-2 w-full accent-ouro-escuro"
          />
          <div className="mt-1 text-[11px] text-slate-400">
            Faixa {caixa >= corte ? "acima de 30 MM" : "200 mil – 30 MM"} · {r.pctCompr}% do CDI
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Dias de aplicação
            </label>
            <span className="font-mono text-[15px] font-semibold text-azul-profundo">{dias}</span>
          </div>
          <input
            type="range"
            min={1}
            max={90}
            step={1}
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="mt-2 w-full accent-ouro-escuro"
          />
          <div className="mt-1 text-[11px] text-slate-400">≈ {du(dias)} dias úteis de rendimento</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label="Rendimento líquido no período"
          value={fmt(r.comprPeriodo)}
          foot="compromissada · após IR"
        />
        <Kpi label="Por dia útil" value={fmt(r.porDiaUtil)} foot="média líquida / dia útil" />
        <Kpi label="Em 1 mês aplicado" value={fmt(r.comprMes)} foot="30 dias corridos · 21 úteis" />
      </div>

      {/* Comparação compromissada x CDB */}
      <div className="rounded-lg border border-slate-200 bg-branco p-4">
        <h4 className="mb-3 text-[13px] font-semibold text-azul-profundo">
          No período de {dias} dias — quem rende mais?
        </h4>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="text-slate-600">
                Compromissada BTG{" "}
                <span className="text-slate-400">· isenta de IOF · {r.pctCompr}% CDI</span>
              </span>
              <span className="font-mono font-semibold text-ouro-escuro">{fmt(r.comprPeriodo)}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-ouro-escuro"
                style={{ width: `${(r.comprPeriodo / maxBar) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="text-slate-600">
                CDB {cdbPct}% CDI <span className="text-slate-400">· com IOF regressivo até 30 dias</span>
              </span>
              <span className="font-mono font-semibold text-azul-corporativo">{fmt(r.cdbPeriodo)}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-azul-corporativo"
                style={{ width: `${(r.cdbPeriodo / maxBar) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div
          className={`mt-3 rounded-md px-3 py-2 text-[12.5px] font-medium ${
            r.vencedor === "compr"
              ? "bg-ouro/10 text-ouro-escuro"
              : "bg-slate-100 text-azul-corporativo"
          }`}
        >
          {r.vencedor === "compr"
            ? `A compromissada rende ${fmt(r.dif)} a mais no período — por não pagar IOF no giro curto.`
            : `Nesse prazo o CDB supera a compromissada em ${fmt(r.dif)} (o IOF já ficou para trás).`}
        </div>
      </div>

      {/* Custo do caixa parado */}
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-red-600">Custo do caixa parado</div>
        <div className="mt-0.5 font-mono text-[18px] font-semibold text-red-700">
          {fmt(r.comprPeriodo)}
        </div>
        <div className="mt-0.5 text-[12px] text-slate-500">
          é o que a empresa deixa na mesa mantendo esse caixa em conta corrente pelo período.
        </div>
      </div>

      {/* Premissas editáveis */}
      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-slate-600">
          Premissas (CDI, faixas de taxa)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <PremissaInput label="CDI (% a.a.)" value={cdi} onChange={setCdi} step={0.05} />
          <PremissaInput label="Compr. até 30 MM (% CDI)" value={tier1} onChange={setTier1} />
          <PremissaInput label="Compr. acima 30 MM (% CDI)" value={tier2} onChange={setTier2} />
          <PremissaInput label="Corte de faixa (R$)" value={corte} onChange={setCorte} step={1_000_000} />
          <PremissaInput label="CDB comparativo (% CDI)" value={cdbPct} onChange={setCdbPct} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Rendimento líquido no período (compromissada): {fmt2(r.comprPeriodo)}. Simulação — não é
          garantia de resultado; confirme as taxas na mesa BTG.
        </p>
      </details>
    </div>
  );
}

function PremissaInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-slate-200 bg-branco px-2 py-1.5 font-mono text-[13px] text-azul-profundo focus:border-ouro-escuro focus:outline-none"
      />
    </label>
  );
}
