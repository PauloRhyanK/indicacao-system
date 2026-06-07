import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchMe, isAuthenticated } from "@/lib/api/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
    try {
      const session = await fetchMe();
      return { user: session.user, permissions: session.permissions };
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
