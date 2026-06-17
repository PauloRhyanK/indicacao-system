import { createFileRoute } from "@tanstack/react-router";
import { PerfilConfiguracoesPage } from "@/components/cais/rj/PerfilConfiguracoesPage";

export const Route = createFileRoute("/_authenticated/configuracoes/perfil")({
  head: () => ({ meta: [{ title: "Minhas configurações — CAIS Confidencial" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    google: typeof search.google === "string" ? search.google : undefined,
    msg: typeof search.msg === "string" ? search.msg : undefined,
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { google, msg } = Route.useSearch();
  return <PerfilConfiguracoesPage google={google} msg={msg} />;
}
