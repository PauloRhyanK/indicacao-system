import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { logout } from "@/lib/api/auth";
import { RestrictedAccessScreen } from "../components/RestrictedAccessScreen";

export const Route = createFileRoute("/acesso-negado")({
  head: () => ({
    meta: [{ title: "Acesso restrito — CAIS Confidencial" }],
  }),
  component: AcessoNegadoPage,
});

function AcessoNegadoPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return <RestrictedAccessScreen onLogout={handleLogout} />;
}
