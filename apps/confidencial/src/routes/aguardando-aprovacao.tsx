import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMe, isAuthenticated, logout } from "@/lib/api/auth";
import { PendingApprovalScreen } from "../components/PendingApprovalScreen";

export const Route = createFileRoute("/aguardando-aprovacao")({
  head: () => ({
    meta: [{ title: "Aguardando liberação — CAIS Confidencial" }],
  }),
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AguardandoAprovacaoPage,
});

function AguardandoAprovacaoPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void fetchMe()
      .then((session) => {
        if (session.user.confidencialApprovedAt) {
          navigate({ to: "/credores", replace: true });
          return;
        }
        setEmail(session.user.email);
      })
      .catch(() => {
        logout();
        navigate({ to: "/login", replace: true });
      });
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <PendingApprovalScreen
      email={email}
      onLogout={handleLogout}
      onApproved={() => navigate({ to: "/credores", replace: true })}
    />
  );
}
