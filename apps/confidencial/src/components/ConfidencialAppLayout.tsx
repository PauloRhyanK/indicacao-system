import { Link, useRouterState, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";
import caisLogo from "@/assets/cais-logo.png";

const navItems = [
  { to: "/credores", label: "Credores", icon: Users, permission: ["rj.view"] as const },
  { to: "/agenda", label: "Agenda", icon: CalendarDays, permission: ["rj.agenda.view"] as const },
  { to: "/historico", label: "Histórico", icon: History, adminOnly: true as const },
  { to: "/configuracoes", label: "Configurações", icon: Settings, permission: ["rj.settings"] as const },
] as const;

const STORAGE_KEY = "cais-confidencial-sidebar-expanded";

export function ConfidencialAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { can, canAny, canRjSettings } = usePermissions();
  const [expanded, setExpanded] = useState(true);

  const nav = navItems.filter((item) => {
    if ("adminOnly" in item && item.adminOnly) return canRjSettings();
    if (item.to === "/configuracoes") return canRjSettings();
    if ("permission" in item) return canAny(...item.permission);
    return false;
  });
  const readOnly = can("rj.view") && !can("rj.manage");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setExpanded(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col bg-azul-profundo transition-[width] duration-200 ease-in-out md:flex",
          expanded ? "w-[240px]" : "w-[72px]",
        )}
      >
        <div className={cn("py-6", expanded ? "px-6" : "px-3")}>
          <Link to="/credores" className="block">
            <img
              src={caisLogo}
              alt="CAIS"
              className={cn(
                "w-auto object-contain object-left",
                expanded ? "h-[64px]" : "mx-auto h-8",
              )}
            />
            {expanded && (
              <div className="mt-2 text-[11px] italic text-ouro">Ambiente confidencial</div>
            )}
          </Link>
        </div>

        {expanded && (
          <div className="mx-6 h-px bg-linear-to-r from-transparent via-ouro to-transparent opacity-50" />
        )}

        <nav className={cn("mt-4 flex flex-1 flex-col gap-1", expanded ? "px-3" : "px-2")}>
          {nav.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={expanded ? undefined : item.label}
                className={cn(
                  "flex items-center rounded-md border-l-2 py-2.5 text-[14px] transition-colors",
                  expanded ? "gap-3 px-3" : "justify-center border-l-0 px-0",
                  active
                    ? expanded
                      ? "border-ouro bg-azul-marinho text-branco"
                      : "bg-azul-marinho text-branco"
                    : expanded
                      ? "border-transparent text-azul-ceu hover:bg-azul-marinho/50 hover:text-branco"
                      : "text-azul-ceu hover:bg-azul-marinho/50 hover:text-branco",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {expanded && user && (
          <div className="mx-3 mb-2 rounded-md border border-azul-marinho/50 bg-azul-marinho/30 px-3 py-2.5">
            <p className="truncate text-[12px] font-medium text-branco">{user.name}</p>
            <p className="truncate text-[11px] text-azul-ceu">{user.email}</p>
            {readOnly && (
              <span className="mt-1.5 inline-block rounded border border-ouro/30 bg-ouro/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ouro">
                Consulta
              </span>
            )}
          </div>
        )}

        <div className={cn("flex flex-col gap-1", expanded ? "m-3" : "mx-2 mb-3")}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Recolher menu" : "Expandir menu"}
            className={cn(
              "flex items-center rounded-md text-azul-ceu transition-colors hover:bg-azul-marinho/50 hover:text-branco",
              expanded ? "gap-3 px-3 py-2.5 text-[14px]" : "justify-center py-2.5",
            )}
          >
            {expanded ? (
              <>
                <ChevronLeft className="h-[18px] w-[18px] shrink-0" />
                Recolher
              </>
            ) : (
              <ChevronRight className="h-[18px] w-[18px] shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title={expanded ? undefined : "Sair"}
            className={cn(
              "flex items-center rounded-md text-azul-ceu transition-colors hover:bg-azul-marinho/50 hover:text-branco",
              expanded ? "gap-3 px-3 py-2.5 text-[14px]" : "justify-center py-2.5",
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {expanded && "Sair"}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-in-out",
          expanded ? "md:ml-[240px]" : "md:ml-[72px]",
        )}
      >
        <header className="flex items-center justify-between bg-azul-profundo px-4 py-3 md:hidden">
          <Link to="/credores">
            <img src={caisLogo} alt="CAIS" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex flex-col items-end gap-0.5">
            <span className="rounded border border-amber-200/40 bg-amber-50/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ouro">
              Confidencial
            </span>
            {readOnly && (
              <span className="text-[10px] font-medium text-azul-ceu">Modo consulta</span>
            )}
          </div>
          <button type="button" onClick={handleLogout} className="text-azul-ceu">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-6 md:px-8 md:pb-10 animate-fade-in">
          {children}
        </main>
      </div>

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
