import { createFileRoute, redirect } from "@tanstack/react-router";
import { RjCredoresPage } from "@/components/cais/rj/RjCredoresPage";
import { usePermissions } from "@/lib/use-permissions";
import { ReadOnlyBanner } from "../../components/ReadOnlyBanner";

export const Route = createFileRoute("/_authenticated/credores")({
  head: () => ({ meta: [{ title: "Credores MG2 — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!context.permissions.includes("rj.view")) {
      throw redirect({ to: "/acesso-negado" });
    }
  },
  component: CredoresPage,
});

function CredoresPage() {
  const { user } = Route.useRouteContext();
  const { can } = usePermissions();
  const readOnly = !can("rj.manage");

  return (
    <>
      {readOnly && <ReadOnlyBanner user={user} />}
      <RjCredoresPage />
    </>
  );
}
