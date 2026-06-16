import { Field, inputClass } from "@/components/cais/SlideOver";
import type { RjKpis } from "@/lib/cais-api";
import { computeRepresentatividade, formatRjPlain, parseRjNum } from "@/lib/rj-format";

export function RjRepresentatividadePanel({
  kpis,
  passivoInput,
  onPassivoChange,
  canManage,
}: {
  kpis: RjKpis;
  passivoInput: string;
  onPassivoChange: (value: string) => void;
  canManage: boolean;
}) {
  const passivo = parseRjNum(passivoInput);
  const { confPct, pendPct } = computeRepresentatividade(
    kpis.votoConf,
    kpis.votoTotal,
    passivo,
  );

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-azul-profundo">
            Representatividade no passivo
          </h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            % do passivo total coberto pelos créditos com voto
          </p>
        </div>
        <Field label="Passivo total (R$)">
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="0"
            value={passivoInput}
            onChange={(e) => onPassivoChange(e.target.value)}
            disabled={!canManage}
          />
        </Field>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${confPct ?? 0}%` }}
        />
        <div
          className="bg-ouro transition-all duration-300"
          style={{ width: `${pendPct ?? 0}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
        <span className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Confirmado que vota:{" "}
          <strong className="text-azul-profundo">
            {confPct != null ? `${confPct.toFixed(1)}%` : "—"}
          </strong>
          {passivo > 0 && (
            <span className="text-slate-400">({formatRjPlain(kpis.votoConf)} de {formatRjPlain(passivo)})</span>
          )}
        </span>
        <span className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-ouro" />
          Pendente (sujeitos):{" "}
          <strong className="text-azul-profundo">
            {pendPct != null ? `${pendPct.toFixed(1)}%` : "—"}
          </strong>
        </span>
      </div>

      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        Classe III (quirografário): voto por cabeça + valor. Use o passivo para medir
        representatividade econômica do bloco.
      </p>
    </div>
  );
}
