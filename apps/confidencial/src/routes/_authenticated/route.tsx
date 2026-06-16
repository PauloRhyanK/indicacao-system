import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchMe, isAuthenticated, isConfidencialApproved } from "@/lib/api/auth";
import { ConfidencialAppLayout } from "../../components/ConfidencialAppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
    try {
      const session = await fetchMe();
      if (session.user.accessScope === "INTERNAL") {
        throw redirect({ to: "/acesso-negado" });
      }
      if (session.user.mustChangePassword) {
        throw redirect({ to: "/primeiro-acesso" });
      }
      if (!session.permissions.includes("rj.view")) {
        throw redirect({ to: "/acesso-negado" });
      }
      if (!isConfidencialApproved(session.user)) {
        throw redirect({ to: "/aguardando-aprovacao" });
      }
      return { user: session.user, permissions: session.permissions };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <ConfidencialAppLayout>
      <Outlet />
    </ConfidencialAppLayout>
  );
}
