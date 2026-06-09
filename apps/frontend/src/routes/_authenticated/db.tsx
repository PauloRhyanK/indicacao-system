import { createFileRoute, redirect } from "@tanstack/react-router";

const dbAdminUrl = import.meta.env.VITE_DB_ADMIN_URL as string | undefined;

export const Route = createFileRoute("/_authenticated/db")({
  head: () => ({ meta: [{ title: "Banco de dados — CAIS" }] }),
  beforeLoad: () => {
    if (dbAdminUrl?.trim()) {
      throw redirect({ href: dbAdminUrl.trim() });
    }
    throw redirect({ to: "/configuracoes" });
  },
});
