import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Network,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/indicacoes", label: "Indicações", icon: Network },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + "/");

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col bg-azul-profundo md:flex">
        <div className="px-6 py-6">
          <div className="text-[20px] font-semibold tracking-[1px] text-branco">
            CAIS
          </div>
          <div className="text-[11px] italic text-ouro">
            Indicação de Consórcios
          </div>
        </div>
        <div className="mx-6 h-px bg-linear-to-r from-transparent via-ouro to-transparent opacity-50" />
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-[14px] transition-colors",
                  active
                    ? "border-ouro bg-azul-marinho text-branco"
                    : "border-transparent text-azul-ceu hover:bg-azul-marinho/50 hover:text-branco",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] text-azul-ceu transition-colors hover:bg-azul-marinho/50 hover:text-branco"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </aside>

      {/* Main content */}
      <div className="flex w-full flex-1 flex-col md:ml-[240px]">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between bg-azul-profundo px-4 py-3 md:hidden">
          <div className="text-[18px] font-semibold tracking-[1px] text-branco">
            CAIS
          </div>
          <button onClick={handleLogout} className="text-azul-ceu">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-azul-profundo md:hidden">
        {nav.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]",
                active ? "text-ouro" : "text-azul-ceu",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
