import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { canAccessRjSettings } from "@/lib/use-permissions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  beforeLoad: ({ context }) => {
    if (!canAccessRjSettings(context.permissions, context.user.roles)) {
      throw redirect({ to: "/credores" });
    }
  },
  component: () => <Outlet />,
});
