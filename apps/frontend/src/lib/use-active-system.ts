import { useCallback, useSyncExternalStore } from "react";

/**
 * "Sistema" ativo da aplicação. A CAIS opera dois sistemas sobre a mesma base
 * de usuários: o de Investimento (principal) e o de Consórcio. A preferência
 * é persistida e usada para escolher o conjunto de navegação e o landing.
 */
export type ActiveSystem = "investimento" | "consorcio";

const STORAGE_KEY = "cais-active-system";
const DEFAULT_SYSTEM: ActiveSystem = "investimento";

export const SYSTEM_HOME: Record<ActiveSystem, string> = {
  investimento: "/investimentos",
  consorcio: "/dashboard",
};

/** Rotas que pertencem ao sistema de Investimento. */
const INVEST_PREFIXES = ["/investimentos"];
/** Rotas do Consórcio. `/configuracoes` é neutra e não muda o sistema. */
const CONSORCIO_PREFIXES = ["/dashboard", "/leads", "/vendas", "/indicacoes"];

/** Infere o sistema a partir do pathname; retorna null para rotas neutras. */
export function systemFromPath(pathname: string): ActiveSystem | null {
  if (INVEST_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return "investimento";
  }
  if (CONSORCIO_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return "consorcio";
  }
  return null;
}

function readStored(): ActiveSystem {
  if (typeof window === "undefined") return DEFAULT_SYSTEM;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "consorcio" || v === "investimento" ? v : DEFAULT_SYSTEM;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setActiveSystem(system: ActiveSystem) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, system);
  }
  listeners.forEach((cb) => cb());
}

/**
 * Sistema ativo. Prioriza o sistema inferido do pathname atual (para deep
 * links) e cai na preferência salva em rotas neutras.
 */
export function useActiveSystem(pathname: string): {
  activeSystem: ActiveSystem;
  switchTo: (system: ActiveSystem) => void;
} {
  const stored = useSyncExternalStore(subscribe, readStored, () => DEFAULT_SYSTEM);
  const fromPath = systemFromPath(pathname);
  const activeSystem = fromPath ?? stored;

  const switchTo = useCallback((system: ActiveSystem) => setActiveSystem(system), []);

  return { activeSystem, switchTo };
}
