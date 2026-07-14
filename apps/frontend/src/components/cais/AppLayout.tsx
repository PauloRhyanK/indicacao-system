import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  Network,
  Settings,
  LogOut,
  ShoppingCart,
  KanbanSquare,
  ArrowLeftRight,
  PhoneCall,
  CalendarClock,
  BadgeCheck,
  MessageSquareQuote,
  Calculator,
} from "lucide-react";
import { logout } from "@/lib/api/auth";
import { usePermissions } from "@/lib/use-permissions";
import {
  SYSTEM_HOME,
  useActiveSystem,
  type ActiveSystem,
} from "@/lib/use-active-system";
import { cn } from "@/lib/utils";
import caisLogo from "@/assets/cais-logo.png";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: readonly string[] | null;
  exact?: boolean;
};

const NAV_BY_SYSTEM: Record<ActiveSystem, readonly NavItem[]> = {
  investimento: [
    { to: "/investimentos", label: "Dashboard", icon: LayoutDashboard, permission: ["investimentos.view"], exact: true },
    { to: "/investimentos/pipeline", label: "Pipeline", icon: KanbanSquare, permission: ["investimentos.view"] },
    { to: "/investimentos/clientes", label: "Clientes", icon: Users, permission: ["investimentos.view"] },
    { to: "/investimentos/qualificacao", label: "Qualificação", icon: BadgeCheck, permission: ["investimentos.qualify", "investimentos.manage"] },
    { to: "/investimentos/sdr", label: "Fila SDR", icon: PhoneCall, permission: ["investimentos.edit", "investimentos.manage"] },
    { to: "/investimentos/reunioes", label: "Minhas reuniões", icon: CalendarClock, permission: ["investimentos.edit", "investimentos.manage"] },
    { to: "/investimentos/pitches", label: "Pitches", icon: MessageSquareQuote, permission: ["investimentos.view"] },
    { to: "/investimentos/reuniao-assistencia", label: "Assistência reunião", icon: Calculator, permission: ["investimentos.edit", "investimentos.manage"] },
    { to: "/configuracoes", label: "Configurações", icon: Settings, permission: null },
  ],
  consorcio: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
    { to: "/leads", label: "Leads", icon: Users, permission: ["leads.view_all", "leads.view_own"] },
    { to: "/vendas", label: "Registrar Venda", icon: ShoppingCart, permission: ["sales.create"] },
    { to: "/indicacoes", label: "Indicações", icon: Network, permission: ["leads.view_all", "leads.view_own"] },
    { to: "/configuracoes", label: "Configurações", icon: Settings, permission: null },
  ],
};

const SYSTEM_META: Record<ActiveSystem, { label: string; subtitle: string }> = {
  investimento: { label: "Investimentos", subtitle: "CRM de Investimentos" },
  consorcio: { label: "Consórcio", subtitle: "Indicação de Consórcios" },
};

const CONSORCIO_ACCESS = [
  "leads.view_all",
  "leads.view_own",
  "sales.create",
  "sales.view_all",
  "dashboard.general",
  "rewards.payments",
] as const;

const STORAGE_KEY = "cais-sidebar-expanded";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { canAny } = usePermissions();
  const [expanded, setExpanded] = useState(true);
  const { activeSystem, switchTo } = useActiveSystem(pathname);

  const hasInvest = canAny("investimentos.view");
  const hasConsorcio = canAny(...CONSORCIO_ACCESS);
  const otherSystem: ActiveSystem =
    activeSystem === "investimento" ? "consorcio" : "investimento";
  const canSwitch = otherSystem === "investimento" ? hasInvest : hasConsorcio;

  const nav = NAV_BY_SYSTEM[activeSystem].filter(
    (item) => !item.permission || canAny(...item.permission),
  );
  const meta = SYSTEM_META[activeSystem];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setExpanded(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(item.to + "/");

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const handleSwitch = () => {
    switchTo(otherSystem);
    navigate({ to: SYSTEM_HOME[otherSystem] });
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col bg-azul-profundo transition-[width] duration-200 ease-in-out md:flex",
          expanded ? "w-[240px]" : "w-[72px]",
        )}
      >
        <div className={cn("py-6", expanded ? "px-6" : "px-3")}>
          <Link to={SYSTEM_HOME[activeSystem]} className="block">
            <img
              src={caisLogo}
              alt="Cais"
              className={cn(
                "w-auto object-contain object-left",
                expanded ? "h-[64px]" : "mx-auto h-8",
              )}
            />
            {expanded && (
              <div className="mt-2 text-[11px] italic text-ouro">{meta.subtitle}</div>
            )}
          </Link>
        </div>

        {expanded && (
          <div className="mx-6 h-px bg-linear-to-r from-transparent via-ouro to-transparent opacity-50" />
        )}

        <nav className={cn("mt-4 flex flex-1 flex-col gap-1", expanded ? "px-3" : "px-2")}>
          {nav.map((item) => {
            const active = isActive(item);
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

        <div className={cn("flex flex-col gap-1", expanded ? "m-3" : "mx-2 mb-3")}>
          {canSwitch && (
            <button
              type="button"
              onClick={handleSwitch}
              title={expanded ? undefined : `Ir para ${SYSTEM_META[otherSystem].label}`}
              className={cn(
                "flex items-center rounded-md border border-ouro/40 text-ouro transition-colors hover:bg-ouro/10",
                expanded ? "gap-3 px-3 py-2.5 text-[13px]" : "justify-center py-2.5",
              )}
            >
              <ArrowLeftRight className="h-[18px] w-[18px] shrink-0" />
              {expanded && (
                <span className="truncate">
                  Ir para <b className="font-semibold">{SYSTEM_META[otherSystem].label}</b>
                </span>
              )}
            </button>
          )}

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

      {/* Main content */}
      <div
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-in-out",
          expanded ? "md:ml-[240px]" : "md:ml-[72px]",
        )}
      >
        {/* Mobile top bar */}
        <header className="flex items-center justify-between bg-azul-profundo px-4 py-3 md:hidden">
          <Link to={SYSTEM_HOME[activeSystem]}>
            <img src={caisLogo} alt="Cais" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {canSwitch && (
              <button
                onClick={handleSwitch}
                className="flex items-center gap-1.5 rounded-md border border-ouro/40 px-2.5 py-1.5 text-[12px] text-ouro"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {SYSTEM_META[otherSystem].label}
              </button>
            )}
            <button onClick={handleLogout} className="text-azul-ceu">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-6 md:px-8 md:pb-10 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-azul-profundo md:hidden">
        {nav.map((item) => {
          const active = isActive(item);
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
