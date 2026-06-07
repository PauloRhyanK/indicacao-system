import { useEffect, useState } from "react";
import { formatBRL, type PersonalDashboard } from "@/lib/cais-api";

interface PersonalGoalHeroProps {
  data: PersonalDashboard;
  userName: string;
  greeting: string;
  onConfigureGoal?: () => void;
}

export function PersonalGoalHero({
  data,
  userName,
  greeting,
  onConfigureGoal,
}: PersonalGoalHeroProps) {
  const [progressW, setProgressW] = useState(0);
  const pct = data.resolvedDailyTarget > 0 ? data.dailyPercent : 0;
  const showConfigure = data.personalDailyTarget === null && onConfigureGoal;

  useEffect(() => {
    const t = setTimeout(() => setProgressW(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-xl bg-azul-profundo px-6 py-6 text-branco md:px-8 md:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,189,126,0.12),transparent_55%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-semibold md:text-[26px]">
            {greeting}, {userName} 👋
          </p>
          <p className="mt-1 text-[13px] capitalize text-azul-ceu">Hoje é {dateLabel}</p>

          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[1.2px] text-azul-ceu">
                Meta do dia
                {data.targetSource === "personal" ? " · pessoal" : " · empresa"}
              </span>
              {showConfigure && (
                <button
                  type="button"
                  onClick={onConfigureGoal}
                  className="text-[12px] font-medium text-ouro hover:text-ouro-claro"
                >
                  Configurar minha meta
                </button>
              )}
            </div>

            {data.resolvedDailyTarget > 0 ? (
              <>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-ouro transition-[width] duration-1000 ease-out"
                    style={{ width: `${progressW}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] text-branco/90">
                    {formatBRL(data.mySalesToday)} / {formatBRL(data.resolvedDailyTarget)}
                  </span>
                  <span className="text-[14px] font-semibold text-ouro">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[12px] text-azul-ceu">
                  <span>{pct.toFixed(0)}% atingido</span>
                  <span>
                    {data.remaining > 0
                      ? `Faltam ${formatBRL(data.remaining)} para a meta`
                      : "Meta do dia atingida!"}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-[28px] font-semibold">{formatBRL(data.mySalesToday)}</p>
                <p className="mt-1 text-[13px] text-azul-ceu">
                  vendido hoje · sem meta definida
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-end">
          {data.streakDays > 0 && (
            <span className="inline-flex items-center rounded-full border border-ouro/35 bg-ouro/10 px-3 py-1.5 text-[12px] font-medium text-ouro">
              🔥 {data.streakDays} dia{data.streakDays !== 1 ? "s" : ""} seguidos com venda
            </span>
          )}
          {data.rankPosition != null && data.rankTotal > 0 && (
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-branco/90">
              #{data.rankPosition} no ranking do mês
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
