import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchMe, isAuthenticated, isConfidencialApproved } from "@/lib/api/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    try {
      const session = await fetchMe();
      if (!session.permissions.includes("rj.view")) {
        throw redirect({ to: "/acesso-negado" });
      }
      if (!isConfidencialApproved(session.user)) {
        throw redirect({ to: "/aguardando-aprovacao" });
      }
      throw redirect({ to: "/credores" });
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
});
