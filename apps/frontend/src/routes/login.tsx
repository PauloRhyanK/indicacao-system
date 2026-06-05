import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/cais/Button";
import { inputClass } from "@/components/cais/SlideOver";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — CAIS" },
      {
        name: "description",
        content: "Acesse o CAIS, sistema de indicação de consórcios.",
      },
    ],
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
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-azul-profundo via-azul-marinho to-azul-corporativo px-4">
      <div className="w-full max-w-md rounded-lg bg-branco p-8 shadow-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="text-[28px] font-semibold tracking-[2px] text-azul-profundo">
            CAIS
          </div>
          <div className="text-[13px] italic text-ouro-escuro">
            Sistema de Indicação de Consórcios
          </div>
        </div>

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

          {error && (
            <p className="text-[12px] text-status-red">{error}</p>
          )}

          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-slate-500">
          Não tem conta?{" "}
          <Link to="/register" className="font-medium text-azul-corporativo hover:text-ouro-escuro">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
