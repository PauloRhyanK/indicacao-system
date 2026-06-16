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
    key: "rj.view",
    label: "Ver condomínio de credores (RJ)",
    groupName: "Recuperacao Judicial",
  },
  {
    key: "rj.manage",
    label: "Gerenciar condomínio de credores (RJ)",
    groupName: "Recuperacao Judicial",
  },
];

export const CONFIDENCIAL_ROLE_PERMISSION_KEYS = ["rj.view"] as const;

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
] as const;

export const ROLE_ADMIN_NAME = "Administrador";
export const ROLE_COLABORADOR_NAME = "Colaborador";
export const ROLE_CONFIDENCIAL_NAME = "Acesso Confidencial";
