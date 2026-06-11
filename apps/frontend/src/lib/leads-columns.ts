export type LeadGridColumnField =
  | "name"
  | "phone"
  | "opportunity"
  | "created_at"
  | "created_by_name"
  | "status_name"
  | "opportunity_grade_label"
  | "offered_amount"
  | "closed_amount"
  | "assigned_name"
  | "first_contact_name"
  | "updated_at"
  | "referrer_label"
  | "notes";

export interface LeadGridColumnConfig {
  field: LeadGridColumnField;
  label: string;
  defaultVisible: boolean;
  locked?: boolean;
}

export const LEAD_GRID_COLUMN_CONFIGS: LeadGridColumnConfig[] = [
  { field: "name", label: "Nome", defaultVisible: true, locked: true },
  { field: "phone", label: "Celular", defaultVisible: true },
  { field: "opportunity", label: "Oportunidade", defaultVisible: true },
  { field: "created_at", label: "Data registro", defaultVisible: false },
  { field: "created_by_name", label: "Criado por", defaultVisible: false },
  { field: "status_name", label: "Status", defaultVisible: true },
  { field: "opportunity_grade_label", label: "Grau", defaultVisible: true },
  { field: "offered_amount", label: "Valor ofertado", defaultVisible: true },
  { field: "closed_amount", label: "Valor fechado", defaultVisible: false },
  { field: "assigned_name", label: "Vendedor responsável", defaultVisible: true },
  { field: "first_contact_name", label: "Primeiro contato", defaultVisible: true },
  { field: "updated_at", label: "Última atualização", defaultVisible: false },
  { field: "referrer_label", label: "Indicado por", defaultVisible: true },
  { field: "notes", label: "Observações", defaultVisible: false },
];

export const LEADS_COLUMNS_STORAGE_KEY = "cais-leads-grid-columns";

export type LeadColumnVisibility = Record<LeadGridColumnField, boolean>;

export function getDefaultColumnVisibility(): LeadColumnVisibility {
  return Object.fromEntries(
    LEAD_GRID_COLUMN_CONFIGS.map((c) => [c.field, c.defaultVisible]),
  ) as LeadColumnVisibility;
}

export function loadColumnVisibility(): LeadColumnVisibility {
  const defaults = getDefaultColumnVisibility();
  try {
    const raw = localStorage.getItem(LEADS_COLUMNS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<LeadColumnVisibility>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveColumnVisibility(visibility: LeadColumnVisibility): void {
  localStorage.setItem(LEADS_COLUMNS_STORAGE_KEY, JSON.stringify(visibility));
}

export function countHiddenColumns(visibility: LeadColumnVisibility): number {
  return LEAD_GRID_COLUMN_CONFIGS.filter(
    (c) => !c.locked && visibility[c.field] === false,
  ).length;
}
