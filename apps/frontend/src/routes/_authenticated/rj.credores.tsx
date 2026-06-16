import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/cais/AppLayout";
import { RjCredoresPage } from "@/components/cais/rj/RjCredoresPage";

export const Route = createFileRoute("/_authenticated/rj/credores")({
  head: () => ({ meta: [{ title: "Credores MG2 — CAIS" }] }),
  beforeLoad: ({ context }) => {
    if (!context.permissions.includes("rj.view")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RjCredoresRoute,
});

function RjCredoresRoute() {
  return (
    <AppLayout>
      <RjCredoresPage />
    </AppLayout>
  );
}
