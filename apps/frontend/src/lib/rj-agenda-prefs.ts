const STORAGE_KEY = "cais.rj.agenda.prefs";

export type AgendaMode = "calendar" | "list";
export type AgendaScope = "mine" | "all";
export type AgendaCalView = "month" | "week" | "day";

export interface RjAgendaPrefs {
  mode: AgendaMode;
  calView: AgendaCalView;
  scope: AgendaScope;
}

const DEFAULT: RjAgendaPrefs = {
  mode: "calendar",
  calView: "month",
  scope: "mine",
};

export function loadRjAgendaPrefs(): RjAgendaPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<RjAgendaPrefs>;
    return {
      mode: parsed.mode === "list" ? "list" : "calendar",
      calView:
        parsed.calView === "week" || parsed.calView === "day" ? parsed.calView : "month",
      scope: parsed.scope === "all" ? "all" : "mine",
    };
  } catch {
    return DEFAULT;
  }
}

export function saveRjAgendaPrefs(prefs: RjAgendaPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // quota ou modo privado — ignora
  }
}
