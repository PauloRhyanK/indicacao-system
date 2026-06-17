import { createFileRoute, redirect } from "@tanstack/react-router";
import { RjAgendaPage } from "@/components/cais/rj/RjAgendaPage";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!context.permissions.includes("rj.agenda.view")) {
      throw redirect({ to: "/credores" });
    }
  },
  component: AgendaPage,
});

function AgendaPage() {
  return <RjAgendaPage />;
}
