import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchMe, isAuthenticated, logout } from "@/lib/api/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
    try {
      const session = await fetchMe();
      if (session.user.accessScope === "CONFIDENCIAL") {
        logout();
        throw redirect({ to: "/login" });
      }
      if (session.user.mustChangePassword) {
        throw redirect({ to: "/primeiro-acesso" });
      }
      return { user: session.user, permissions: session.permissions };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
