export const RJ_STATUS_VALUES = [
  "confirmado",
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
  negociacao: 1,
  juridico: 2,
  semcontato: 3,
  recusou: 4,
};

export type RjFilterKey =
  | "all"
  | RjStatus
  | "fora";

export const RJ_FILTER_CHIPS: { key: RjFilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "juridico", label: "No jurídico" },
  { key: "negociacao", label: "Negociando" },
  { key: "semcontato", label: "Sem contato" },
  { key: "recusou", label: "Fora (recusou)" },
  { key: "fora", label: "Não vota" },
];

export const RJ_STATUS_PILL_CLASS: Record<RjStatus, string> = {
  confirmado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  juridico: "bg-sky-50 text-sky-800 border-sky-200",
  negociacao: "bg-amber-50 text-amber-900 border-amber-200",
  semcontato: "bg-slate-100 text-slate-600 border-slate-200",
  recusou: "bg-red-50 text-red-800 border-red-200",
};
