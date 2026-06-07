import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/cais/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalPerformanceTab } from "@/components/cais/dashboard/PersonalPerformanceTab";
import { OverviewTab } from "@/components/cais/dashboard/OverviewTab";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CAIS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { can } = usePermissions();
  const showOverview = can("dashboard.general");

  if (!showOverview) {
    return (
      <AppLayout>
        <PersonalPerformanceTab />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Tabs defaultValue="performance" className="w-full">
        <TabsList
          className={cn(
            "mb-6 h-auto gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1",
          )}
        >
          <TabsTrigger
            value="performance"
            className="rounded-md px-4 py-2 text-[13px] data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:bg-branco data-[state=active]:text-azul-profundo data-[state=active]:shadow-sm"
          >
            Meu desempenho
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="rounded-md px-4 py-2 text-[13px] data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:bg-branco data-[state=active]:text-azul-profundo data-[state=active]:shadow-sm"
          >
            Visão geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
          <PersonalPerformanceTab />
        </TabsContent>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <OverviewTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
