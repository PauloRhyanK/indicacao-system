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

export const RJ_FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  sujeito: "Sujeito ao condomínio",
  classe: "Classe",
  motivo: "Motivo de exclusão",
  valor: "Valor",
  status: "Status",
  contato: "Contato",
  passo: "Próximo passo",
  retorno: "Data de retorno",
  obs: "Observações",
  passivo: "Passivo total",
};

export const RJ_ENTITY_TYPE_LABELS: Record<string, string> = {
  credor: "Credor",
  config: "Configuração",
  usuario: "Usuário",
  papel: "Papel",
};

export const RJ_ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Alteração",
  delete: "Exclusão",
  approve: "Liberação",
  reset_password: "Reset de senha",
  role_change: "Papéis alterados",
};
