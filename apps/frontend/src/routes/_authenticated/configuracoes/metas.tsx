import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ReadOnlyNotice } from "@/components/cais/ReadOnlyNotice";
import { PersonalDailyGoalCard } from "@/components/cais/PersonalDailyGoalCard";
import { PeriodGoalCard } from "@/components/cais/PeriodGoalCard";
import { WeeklyDefaultsGrid } from "@/components/cais/WeeklyDefaultsGrid";
import { DailyGoalCalendar } from "@/components/cais/DailyGoalCalendar";
import { TeamPersonalGoalsCard } from "@/components/cais/TeamPersonalGoalsCard";
import { InvestMetaCard } from "@/components/cais/invest/InvestMetaCard";
import { usePermissions } from "@/lib/use-permissions";
import { useActiveSystem } from "@/lib/use-active-system";
import { fetchPersonalDashboard } from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes/metas")({
  head: () => ({ meta: [{ title: "Metas — CAIS" }] }),
  component: MetasPage,
});

function MetasPage() {
  const { can } = usePermissions();
  const canEditGlobal = can("meta.configure_global");
  const canEditDay = can("meta.configure_day");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { activeSystem } = useActiveSystem(pathname);
  const isInvest = activeSystem === "investimento";

  const personal = useQuery({
    queryKey: ["personal-dashboard"],
    queryFn: fetchPersonalDashboard,
    enabled: !isInvest,
  });

  return (
    <>
      <Link
        to="/configuracoes"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-azul-medio hover:text-azul-profundo"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Configurações
      </Link>

      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Metas</h1>
        <p className="text-[14px] text-slate-500">
          {isInvest
            ? "Meta de captação da campanha BNF (sistema de Investimento)."
            : "Meta do período, grade semanal padrão e overrides por data (Consórcio)."}
        </p>
      </div>

      {isInvest ? (
        <div className="space-y-6">
          <InvestMetaCard />
        </div>
      ) : (
        <div className="space-y-6">
          <PersonalDailyGoalCard
            initialAmount={personal.data?.personalDailyTarget ?? null}
            companyDailyTarget={personal.data?.companyDailyTarget}
          />

          {!canEditGlobal && !canEditDay && (
            <ReadOnlyNotice message="Apenas usuários com permissão de configuração de metas podem alterar os valores abaixo." />
          )}

          <PeriodGoalCard readOnly={!canEditGlobal} />
          <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
            <WeeklyDefaultsGrid readOnly={!canEditDay} />
            <DailyGoalCalendar readOnly={!canEditDay} />
          </div>
          {canEditGlobal && <TeamPersonalGoalsCard />}
        </div>
      )}
    </>
  );
}
