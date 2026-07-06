import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Investimento é o sistema principal — landing padrão após login.
    throw redirect({ to: "/investimentos" });
  },
});
