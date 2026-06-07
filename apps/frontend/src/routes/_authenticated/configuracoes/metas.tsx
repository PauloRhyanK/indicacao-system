import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminOnlyNotice } from "@/components/cais/AdminOnlyNotice";
import { PersonalDailyGoalCard } from "@/components/cais/PersonalDailyGoalCard";
import { PeriodGoalCard } from "@/components/cais/PeriodGoalCard";
import { WeeklyDefaultsGrid } from "@/components/cais/WeeklyDefaultsGrid";
import { DailyGoalCalendar } from "@/components/cais/DailyGoalCalendar";
import { useIsAdmin } from "@/lib/use-is-admin";
import { fetchPersonalDashboard } from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes/metas")({
  head: () => ({ meta: [{ title: "Metas — CAIS" }] }),
  component: MetasPage,
});

function MetasPage() {
  const canEdit = useIsAdmin();
  const personal = useQuery({
    queryKey: ["personal-dashboard"],
    queryFn: fetchPersonalDashboard,
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
          Meta do período, grade semanal padrão e overrides por data.
        </p>
      </div>

      <div className="space-y-6">
        <PersonalDailyGoalCard
          initialAmount={personal.data?.personalDailyTarget ?? null}
          companyDailyTarget={personal.data?.companyDailyTarget}
        />

        {!canEdit && <AdminOnlyNotice />}

        <PeriodGoalCard readOnly={!canEdit} />
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <WeeklyDefaultsGrid readOnly={!canEdit} />
          <DailyGoalCalendar readOnly={!canEdit} />
        </div>
      </div>
    </>
  );
}
