import { LogOut, Users } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { logout } from "@/lib/api/auth";
import caisLogo from "@/assets/cais-logo.png";

export function ConfidencialLayout({
  children,
  canManageUsers = false,
}: {
  children: React.ReactNode;
  canManageUsers?: boolean;
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-branco">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src={caisLogo} alt="CAIS" className="h-8 w-auto" />
            <div>
              <div className="text-[13px] font-semibold text-azul-profundo">CAIS Confidencial</div>
              <div className="text-[11px] text-slate-500">Recuperação Judicial · Credores MG2</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 sm:inline">
              Controle Interno
            </span>
            {canManageUsers && (
              <Link
                to="/usuarios"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-azul-profundo"
              >
                <Users className="h-3.5 w-3.5" />
                Usuários
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-azul-profundo"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
