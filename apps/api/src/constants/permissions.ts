export interface PermissionDefinition {
  key: string;
  label: string;
  description?: string;
  groupName: string;
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  { key: "leads.view_all", label: "Ver todos os leads", groupName: "Leads" },
  { key: "leads.view_own", label: "Ver somente seus leads", groupName: "Leads" },
  { key: "leads.create", label: "Criar lead", groupName: "Leads" },
  { key: "leads.edit_all", label: "Editar qualquer lead", groupName: "Leads" },
  { key: "leads.edit_own", label: "Editar somente os seus", groupName: "Leads" },
  { key: "leads.delete", label: "Excluir lead", groupName: "Leads" },
  { key: "leads.import", label: "Importar leads (Excel)", groupName: "Leads" },
  { key: "sales.create", label: "Registrar venda", groupName: "Vendas" },
  { key: "sales.view_all", label: "Ver todas as vendas", groupName: "Vendas" },
  { key: "sales.delete", label: "Cancelar venda", groupName: "Vendas" },
  {
    key: "rewards.payments",
    label: "Ver e registrar pagamento de recompensas",
    description: "Equipe comercial, indicação e confirmação de pagamento",
    groupName: "Indicações",
  },
  {
    key: "rewards.client_choice",
    label: "Registrar escolha do cliente",
    description: "Cashback ou voucher de viagens",
    groupName: "Indicações",
  },
  { key: "meta.configure_day", label: "Configurar meta do dia", groupName: "Metas" },
  { key: "meta.configure_global", label: "Configurar meta global", groupName: "Metas" },
  { key: "dashboard.general", label: "Visão geral da empresa", groupName: "Dashboard" },
  { key: "tv.view", label: "Acessar painel TV", groupName: "Dashboard" },
  { key: "users.manage", label: "Gerenciar usuários", groupName: "Administração" },
  { key: "roles.manage", label: "Gerenciar papéis", groupName: "Administração" },
  { key: "settings.manage", label: "Gerenciar domínios do sistema", groupName: "Administração" },
  {
    key: "investimentos.view",
    label: "Ver pipeline de investimentos",
    description: "Consultar leads, funil e meta da campanha BNF",
    groupName: "Investimentos",
  },
  {
    key: "investimentos.create",
    label: "Cadastrar lead de investimento (captação)",
    description: "Qualquer colaborador pode capturar leads, mesmo sem gerir o pipeline",
    groupName: "Investimentos",
  },
  {
    key: "investimentos.manage",
    label: "Gerenciar leads de investimentos",
    description: "Criar, editar, mover etapa, excluir leads e definir a meta de captação",
    groupName: "Investimentos",
  },
  {
    key: "investimentos.import",
    label: "Importar planilha de investimentos",
    groupName: "Investimentos",
  },
  {
    key: "rj.view",
    label: "Ver credores (somente leitura)",
    description: "Consultar e exportar dados dos credores",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.manage",
    label: "Gerenciar credores",
    description: "Criar, editar e excluir credores e parâmetros do condomínio",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.settings",
    label: "Configurações do confidencial",
    description: "Usuários, papéis e permissões do ambiente confidencial",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.agenda.view",
    label: "Ver agenda de reuniões",
    description: "Consultar reuniões em que participa",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.agenda.view_all",
    label: "Ver agenda de toda a equipe",
    description: "Visão gerencial das reuniões de todos os usuários",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.agenda.manage",
    label: "Gerenciar reuniões",
    description: "Criar, editar, cancelar e excluir reuniões",
    groupName: "Recuperacao Judicial",
  },
];

/** Papel padrão ao convidar alguém: opera credores e sua agenda, sem configurações. */
export const CONFIDENCIAL_ROLE_PERMISSION_KEYS = [
  "rj.view",
  "rj.manage",
  "rj.agenda.view",
  "rj.agenda.manage",
] as const;

/** Somente consulta nos credores e na agenda. */
export const CONSULTA_CONFIDENCIAL_ROLE_PERMISSION_KEYS = [
  "rj.view",
  "rj.agenda.view",
] as const;

export const ADMIN_RJ_ROLE_PERMISSION_KEYS = [
  "rj.view",
  "rj.manage",
  "rj.settings",
  "rj.agenda.view",
  "rj.agenda.view_all",
  "rj.agenda.manage",
] as const;

export const RJ_PERMISSION_KEYS = [
  "rj.view",
  "rj.manage",
  "rj.settings",
  "rj.agenda.view",
  "rj.agenda.view_all",
  "rj.agenda.manage",
] as const;

export const RJ_GROUP_NAME = "Recuperacao Judicial";

export const ALL_PERMISSION_KEYS = PERMISSIONS_CATALOG.map((p) => p.key);

/** Espelha o consultor de hoje (sem admin). */
export const COLABORADOR_PERMISSION_KEYS = [
  "leads.view_all",
  "leads.create",
  "leads.edit_all",
  "leads.import",
  "sales.create",
  "sales.view_all",
  "rewards.client_choice",
  "dashboard.general",
  "tv.view",
  "investimentos.view",
  "investimentos.create",
  "investimentos.manage",
  "investimentos.import",
] as const;

export const ROLE_ADMIN_NAME = "Administrador";
export const ROLE_COLABORADOR_NAME = "Colaborador";
export const ROLE_CONFIDENCIAL_NAME = "Acesso Confidencial";
export const ROLE_CONSULTA_CONFIDENCIAL_NAME = "Consulta Confidencial";
export const ROLE_ADMIN_RJ_NAME = "Administrador RJ";

/** Compat: admin RJ antes da migration 0022 tinha só rj.manage para configurações. */
export function applyRjPermissionCompat(perms: Set<string>, roleNames: string[]): void {
  if (
    roleNames.includes(ROLE_ADMIN_RJ_NAME) &&
    perms.has("rj.manage") &&
    !perms.has("rj.settings")
  ) {
    perms.add("rj.settings");
  }

  // Compat agenda: papéis criados antes das permissões de agenda continuam operando.
  if (perms.has("rj.view")) perms.add("rj.agenda.view");
  if (perms.has("rj.manage")) perms.add("rj.agenda.manage");
  if (roleNames.includes(ROLE_ADMIN_RJ_NAME) && perms.has("rj.settings")) {
    perms.add("rj.agenda.view_all");
  }
}

export const RJ_SYSTEM_ROLE_NAMES = [
  ROLE_CONFIDENCIAL_NAME,
  ROLE_CONSULTA_CONFIDENCIAL_NAME,
  ROLE_ADMIN_RJ_NAME,
] as const;
