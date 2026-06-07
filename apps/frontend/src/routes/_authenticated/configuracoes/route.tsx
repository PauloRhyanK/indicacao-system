import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/cais/AppLayout";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesLayout,
});

function ConfiguracoesLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
