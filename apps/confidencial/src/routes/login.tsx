import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { login, isAuthenticated, PASSWORD_SETUP_REQUIRED, ACCESS_DENIED_WRONG_REALM, ACCESS_DENIED_NO_RJ } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/cais/Button";
import { inputClass } from "@/components/cais/SlideOver";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — CAIS Confidencial" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/credores", replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password, "confidencial");
      if (!session.permissions.includes("rj.view")) {
        navigate({ to: "/acesso-negado", replace: true });
        return;
      }
      navigate({ to: "/credores", replace: true });
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.details as { code?: string } | undefined)?.code === PASSWORD_SETUP_REQUIRED
      ) {
        setError("Defina sua senha no primeiro acesso antes de entrar.");
      } else if (
        err instanceof ApiError &&
        (err.details as { code?: string } | undefined)?.code === ACCESS_DENIED_WRONG_REALM
      ) {
        setError("Esta conta não tem acesso a este ambiente. Use o sistema admin.");
      } else if (
        err instanceof ApiError &&
        (err.details as { code?: string } | undefined)?.code === ACCESS_DENIED_NO_RJ
      ) {
        setError("Sem permissão para acessar o ambiente confidencial.");
      } else {
        setError("E-mail ou senha inválidos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-azul-profundo via-azul-marinho to-azul-corporativo px-4">
      <div className="w-full max-w-md rounded-lg bg-branco p-8 shadow-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="text-[28px] font-semibold tracking-[2px] text-azul-profundo">
            CAIS
          </div>
          <div className="text-[13px] italic text-ouro-escuro">Ambiente confidencial</div>
        </div>

        <p className="mb-5 text-center text-[13px] text-slate-600">
          Acesso restrito ao condomínio de credores da Recuperação Judicial.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="voce@empresa.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[12px] text-status-red">{error}</p>}

          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-slate-500">
          Primeiro acesso?{" "}
          <Link
            to="/primeiro-acesso"
            className="font-medium text-azul-corporativo hover:text-ouro-escuro"
          >
            Defina sua senha
          </Link>
        </p>
      </div>
    </div>
  );
}
