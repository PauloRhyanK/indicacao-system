import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setInitialPassword } from "@/lib/api/auth";
import { Button } from "@/components/cais/Button";
import { inputClass } from "@/components/cais/SlideOver";

export const Route = createFileRoute("/primeiro-acesso")({
  head: () => ({
    meta: [{ title: "Primeiro acesso — CAIS" }],
  }),
  component: PrimeiroAcessoPage,
});

function PrimeiroAcessoPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await setInitialPassword(email.trim(), password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível definir a senha.");
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
          <div className="text-[13px] italic text-ouro-escuro">Primeiro acesso</div>
        </div>

        <p className="mb-5 text-center text-[13px] text-slate-600">
          Use o e-mail informado pelo administrador e defina sua senha de login.
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
              placeholder="seu.nome@caisinvestimentos.com.br"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
              Nova senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-[12px] text-status-red">{error}</p>}

          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? "Salvando..." : "Definir senha e entrar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-slate-500">
          Já definiu sua senha?{" "}
          <Link to="/login" className="font-medium text-azul-corporativo hover:text-ouro-escuro">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
