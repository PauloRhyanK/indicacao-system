export const RJ_STATUS_VALUES = [
  "confirmado",
  "agendado",
  "juridico",
  "negociacao",
  "semcontato",
  "recusou",
] as const;

export const RJ_CLASSE_VALUES = ["I", "II", "III", "IV"] as const;

export const RJ_MOTIVO_VALUES = [
  "fiduciaria",
  "leasing",
  "reserva",
  "acc",
  "extra",
  "outro",
] as const;

export type RjStatus = (typeof RJ_STATUS_VALUES)[number];
export type RjClasse = (typeof RJ_CLASSE_VALUES)[number];
export type RjMotivo = (typeof RJ_MOTIVO_VALUES)[number];

export const RJ_STATUS_LABELS: Record<RjStatus, string> = {
  confirmado: "Confirmado",
  agendado: "Reunião agendada",
  juridico: "Aguardando jurídico",
  negociacao: "Em negociação",
  semcontato: "Sem contato",
  recusou: "Recusou / fora",
};

export const RJ_CLASSE_LABELS: Record<RjClasse, string> = {
  I: "I — Trabalhista",
  II: "II — Garantia real",
  III: "III — Quirografário",
  IV: "IV — ME / EPP",
};

export const RJ_CLASSE_VOTE: Record<RjClasse, string> = {
  I: "voto por cabeça",
  II: "cabeça + valor",
  III: "cabeça + valor",
  IV: "voto por cabeça",
};

export const RJ_MOTIVO_LABELS: Record<RjMotivo, string> = {
  fiduciaria: "Alienação fiduciária",
  leasing: "Arrendamento (leasing)",
  reserva: "Reserva de domínio",
  acc: "Adiantamento de câmbio (ACC)",
  extra: "Extraconcursal (art. 84)",
  outro: "Outro",
};

export const RJ_STATUS_ORDER: Record<RjStatus, number> = {
  confirmado: 0,
  agendado: 1,
  negociacao: 2,
  juridico: 3,
  semcontato: 4,
  recusou: 5,
};

export type RjFilterKey =
  | "all"
  | RjStatus
  | "fora";

export const RJ_FILTER_CHIPS: { key: RjFilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "agendado", label: "Reunião agendada" },
  { key: "juridico", label: "No jurídico" },
  { key: "negociacao", label: "Negociando" },
  { key: "semcontato", label: "Sem contato" },
  { key: "recusou", label: "Fora (recusou)" },
  { key: "fora", label: "Não vota" },
];

export const RJ_STATUS_PILL_CLASS: Record<RjStatus, string> = {
  confirmado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  agendado: "bg-violet-50 text-violet-800 border-violet-200",
  juridico: "bg-sky-50 text-sky-800 border-sky-200",
  negociacao: "bg-amber-50 text-amber-900 border-amber-200",
  semcontato: "bg-slate-100 text-slate-600 border-slate-200",
  recusou: "bg-red-50 text-red-800 border-red-200",
};

export const RJ_REUNIAO_STATUS_VALUES = [
  "agendada",
  "realizada",
  "cancelada",
  "naocompareceu",
] as const;

export type RjReuniaoStatus = (typeof RJ_REUNIAO_STATUS_VALUES)[number];

export const RJ_REUNIAO_STATUS_LABELS: Record<RjReuniaoStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  naocompareceu: "Não compareceu",
};

export const RJ_REUNIAO_STATUS_PILL_CLASS: Record<RjReuniaoStatus, string> = {
  agendada: "bg-sky-50 text-sky-800 border-sky-200",
  realizada: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelada: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  naocompareceu: "bg-red-50 text-red-800 border-red-200",
};

export interface RjReuniaoCalendarTheme {
  bg: string;
  accent: string;
  text: string;
}

/** Tokens do calendário (fundo 10–15%, acento na barra lateral, texto Midnight). */
export const RJ_REUNIAO_STATUS_CALENDAR_THEME: Record<RjReuniaoStatus, RjReuniaoCalendarTheme> = {
  agendada: {
    bg: "rgba(0, 59, 92, 0.1)",
    accent: "#003b5c",
    text: "#081421",
  },
  realizada: {
    bg: "rgba(22, 163, 74, 0.15)",
    accent: "#15803d",
    text: "#081421",
  },
  cancelada: {
    bg: "rgba(232, 237, 242, 0.65)",
    accent: "#5c6b7a",
    text: "#5c6b7a",
  },
  naocompareceu: {
    bg: "rgba(154, 77, 46, 0.12)",
    accent: "#9a4d2e",
    text: "#081421",
  },
};

/** @deprecated Use RJ_REUNIAO_STATUS_CALENDAR_THEME */
export const RJ_REUNIAO_STATUS_CALENDAR_COLOR: Record<RjReuniaoStatus, string> = {
  agendada: RJ_REUNIAO_STATUS_CALENDAR_THEME.agendada.accent,
  realizada: RJ_REUNIAO_STATUS_CALENDAR_THEME.realizada.accent,
  cancelada: RJ_REUNIAO_STATUS_CALENDAR_THEME.cancelada.accent,
  naocompareceu: RJ_REUNIAO_STATUS_CALENDAR_THEME.naocompareceu.accent,
};

export const RJ_ENTITY_TYPE_LABELS: Record<string, string> = {
  credor: "Credor",
  config: "Configuração",
  usuario: "Usuário",
  papel: "Papel",
  reuniao: "Reunião",
};

export const RJ_ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Alteração",
  delete: "Exclusão",
  approve: "Liberação",
  reset_password: "Reset de senha",
  role_change: "Papéis alterados",
};
