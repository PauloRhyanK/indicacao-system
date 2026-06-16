import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConfidencialLayout } from "../../components/ConfidencialLayout";
import { RjCredoresPage } from "@/components/cais/rj/RjCredoresPage";

export const Route = createFileRoute("/_authenticated/credores")({
  head: () => ({ meta: [{ title: "Credores MG2 — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!context.permissions.includes("rj.view")) {
      throw redirect({ to: "/acesso-negado" });
    }
  },
  component: CredoresRoute,
});

function CredoresRoute() {
  return (
    <ConfidencialLayout>
      <RjCredoresPage />
    </ConfidencialLayout>
  );
}
