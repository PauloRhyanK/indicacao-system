import { useMemo, useState } from "react";
import { Send } from "lucide-react";

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

/** Monta o HTML do resumo para o cliente (janela própria, sem depender do CSS do app). */
function buildExportHtml(params: {
  leadNome?: string;
  caixa: number;
  dias: number;
  diasUteis: number;
  pctCompr: number;
  cdbPct: number;
  comprPeriodo: number;
  cdbPeriodo: number;
  comprMes: number;
  vencedor: "compr" | "cdb";
  dif: number;
}): string {
  const {
    leadNome,
    caixa,
    dias,
    diasUteis,
    pctCompr,
    cdbPct,
    comprPeriodo,
    cdbPeriodo,
    comprMes,
    vencedor,
    dif,
  } = params;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const maxBar = Math.max(comprPeriodo, cdbPeriodo, 1);
  const comprWidth = Math.round((comprPeriodo / maxBar) * 100);
  const cdbWidth = Math.round((cdbPeriodo / maxBar) * 100);
  const veredito =
    vencedor === "compr"
      ? `A compromissada rende ${fmt(dif)} a mais no período — por não pagar IOF no giro curto.`
      : `Nesse prazo o CDB supera a compromissada em ${fmt(dif)} (o IOF já ficou para trás).`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Simulação Compromissada — CAIS Investimentos</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',sans-serif;color:#0c1d30;padding:32px;max-width:640px;margin:0 auto}
  .tag{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:#b0913f;font-weight:600}
  h1{font-size:20px;font-weight:600;color:#081421;margin-top:4px}
  .sub{font-size:12.5px;color:#4a5b6b;margin-top:2px}
  .kpi{border:1px solid #e6eaee;border-radius:10px;padding:14px 16px;margin-top:18px}
  .kpi .l{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#8b9aa8}
  .kpi .v{font-family:monospace;font-size:26px;font-weight:700;color:#081421;margin-top:2px}
  .kpi .f{font-size:11.5px;color:#8b9aa8;margin-top:2px}
  .cmp{margin-top:20px}
  .row{margin-bottom:12px}
  .rl{display:flex;justify-content:space-between;font-size:12.5px;color:#4a5b6b;margin-bottom:4px}
  .rl b{font-family:monospace;color:#0c1d30}
  .track{height:10px;border-radius:6px;background:#eceff2}
  .fill{height:10px;border-radius:6px}
  .verdict{margin-top:8px;border-radius:8px;padding:10px 12px;font-size:12.5px;font-weight:500}
  .legal{margin-top:28px;border-top:1px solid #e6eaee;padding-top:14px;font-size:10.5px;color:#8b9aa8;line-height:1.6}
  @media print{ body{padding:0} }
</style></head>
<body>
  <div class="tag">CAIS Investimentos · Simulação</div>
  <h1>${leadNome ? `Simulação para ${leadNome}` : "Simulação de rendimento"}</h1>
  <div class="sub">Compromissada BTG × CDB · caixa de ${fmt(caixa)} · ${dias} dias (${diasUteis} úteis) · ${hoje}</div>

  <div class="kpi">
    <div class="l">Rendimento líquido no período</div>
    <div class="v">${fmt(comprPeriodo)}</div>
    <div class="f">compromissada · isenta de IOF · ${pctCompr}% do CDI · após IR</div>
  </div>
  <div class="kpi">
    <div class="l">Projeção em 1 mês aplicado</div>
    <div class="v">${fmt(comprMes)}</div>
    <div class="f">30 dias corridos · 21 dias úteis</div>
  </div>

  <div class="cmp">
    <div class="row">
      <div class="rl"><span>Compromissada BTG (${pctCompr}% CDI, isenta de IOF)</span><b>${fmt(comprPeriodo)}</b></div>
      <div class="track"><div class="fill" style="width:${comprWidth}%;background:#b0913f"></div></div>
    </div>
    <div class="row">
      <div class="rl"><span>CDB ${cdbPct}% CDI (IOF regressivo até 30 dias)</span><b>${fmt(cdbPeriodo)}</b></div>
      <div class="track"><div class="fill" style="width:${cdbWidth}%;background:#346f93"></div></div>
    </div>
    <div class="verdict" style="background:${vencedor === "compr" ? "#f7f0dc" : "#eceff2"};color:${vencedor === "compr" ? "#8a6d1f" : "#346f93"}">
      ${veredito}
    </div>
  </div>

  <div class="legal">
    Simulação com base no CDI e nas condições vigentes na data acima — não constitui garantia de
    resultado. Valores e taxas podem mudar; confirme sempre na proposta formal com a mesa BTG.
    Material de apoio comercial CAIS Investimentos.
  </div>
</body></html>`;
}

export function CompromissadaCalculator({
  caixaInicial,
  leadNome,
}: {
  caixaInicial?: number;
  leadNome?: string;
}) {
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
    const vencedor: "compr" | "cdb" = comprPeriodo >= cdbPeriodo ? "compr" : "cdb";
    const dif = Math.abs(comprPeriodo - cdbPeriodo);
    return { pctCompr, comprPeriodo, cdbPeriodo, comprMes, porDiaUtil, vencedor, dif };
  }, [caixa, dias, cdi, tier1, tier2, corte, cdbPct]);

  const maxBar = Math.max(r.comprPeriodo, r.cdbPeriodo, 1);

  const exportarParaCliente = () => {
    const html = buildExportHtml({
      leadNome,
      caixa,
      dias,
      diasUteis: du(dias),
      pctCompr: r.pctCompr,
      cdbPct,
      comprPeriodo: r.comprPeriodo,
      cdbPeriodo: r.cdbPeriodo,
      comprMes: r.comprMes,
      vencedor: r.vencedor,
      dif: r.dif,
    });
    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportarParaCliente}
          className="inline-flex items-center gap-1.5 rounded-md border border-ouro/40 bg-ouro/10 px-3 py-1.5 text-[12.5px] font-medium text-ouro-escuro hover:bg-ouro/20"
        >
          <Send className="h-3.5 w-3.5" /> Exportar para cliente
        </button>
      </div>

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
