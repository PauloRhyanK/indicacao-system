import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/cais/Button";
import { logout } from "@/lib/api/auth";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-branco p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-700">
          !
        </div>
        <h1 className="text-[20px] font-semibold text-azul-profundo">Acesso restrito</h1>
        <p className="mt-2 text-[14px] text-slate-600">
          Sua conta não possui permissão para acessar o condomínio de credores. Entre em contato
          com o administrador do sistema.
        </p>
        <div className="mt-6">
          <Button variant="ghost" onClick={handleLogout}>
            Sair e usar outra conta
          </Button>
        </div>
      </div>
    </div>
  );
}
