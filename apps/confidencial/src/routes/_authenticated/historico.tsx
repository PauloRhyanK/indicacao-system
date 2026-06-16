import { createFileRoute, redirect } from "@tanstack/react-router";
import { canAccessRjSettings } from "@/lib/use-permissions";
import { RjHistoricoPage } from "@/components/cais/rj/RjHistoricoPage";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!canAccessRjSettings(context.permissions, context.user.roles)) {
      throw redirect({ to: "/credores" });
    }
  },
  component: HistoricoPage,
});

function HistoricoPage() {
  return <RjHistoricoPage />;
}
