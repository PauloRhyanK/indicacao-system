import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/cais/KPICard";
import { PageLoader } from "@/components/cais/Feedback";
import { PersonalGoalHero } from "@/components/cais/dashboard/PersonalGoalHero";
import { DailyInsightCard } from "@/components/cais/dashboard/DailyInsightCard";
import { MySalesTodayList } from "@/components/cais/dashboard/MySalesTodayList";
import { MyActiveLeadsList } from "@/components/cais/dashboard/MyActiveLeadsList";
import { PersonalGoalModal } from "@/components/cais/PersonalGoalModal";
import { fetchPersonalDashboard, formatBRL } from "@/lib/cais-api";
import { fetchMe } from "@/lib/api/auth";

function useGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function PersonalPerformanceTab() {
  const greeting = useGreeting();
  const [userName, setUserName] = useState("Assessor");
  const [configureOpen, setConfigureOpen] = useState(false);

  const dashboard = useQuery({
    queryKey: ["personal-dashboard"],
    queryFn: fetchPersonalDashboard,
  });

  useEffect(() => {
    fetchMe()
      .then((s) => setUserName(s.user.name.split(" ")[0]))
      .catch(() => setUserName("Assessor"));
  }, []);

  if (dashboard.isLoading) return <PageLoader />;
  if (!dashboard.data) {
    return (
      <p className="text-[14px] text-slate-500">Não foi possível carregar seu desempenho.</p>
    );
  }

  const d = dashboard.data;
  const convAboveAvg = d.myConversionRate >= d.teamAvgConversionRate;

  return (
    <>
      <PersonalGoalHero
        data={d}
        userName={userName}
        greeting={greeting}
        onConfigureGoal={() => setConfigureOpen(true)}
      />

      <div className="mt-6">
        <DailyInsightCard message={d.insight.message} followUpCount={d.followUpLeadsCount} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          label="Vendas hoje"
          value={d.mySalesTodayCount}
          valueClassName="text-status-green"
          sub={`${formatBRL(d.mySalesToday)} gerados`}
        />
        <KPICard
          label="Leads ativos"
          value={d.activeLeadsCount}
          sub={
            d.followUpLeadsCount > 0
              ? `${d.followUpLeadsCount} em Follow-up`
              : "Atribuídos a você"
          }
        />
        <KPICard
          label="Tx. conversão"
          value={`${d.myConversionRate.toFixed(0)}%`}
          valueClassName={convAboveAvg ? "text-status-green" : undefined}
          sub={
            convAboveAvg
              ? `acima da média (${d.teamAvgConversionRate.toFixed(0)}%)`
              : `média da equipe ${d.teamAvgConversionRate.toFixed(0)}%`
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MySalesTodayList sales={d.todaySales} />
        <MyActiveLeadsList leads={d.activeLeads} totalCount={d.activeLeadsCount} />
      </div>

      <PersonalGoalModal
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        companyDailyTarget={d.companyDailyTarget}
      />
    </>
  );
}
