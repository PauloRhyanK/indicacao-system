import { apiFetch } from "@/lib/api/client";

export type LeadStatus =
  | "Novo"
  | "Em Contato"
  | "Proposta Enviada"
  | "Convertido"
  | "Perdido";

export const LEAD_STATUSES: LeadStatus[] = [
  "Novo",
  "Em Contato",
  "Proposta Enviada",
  "Convertido",
  "Perdido",
];

export interface Profile {
  id: string;
  name: string;
  role: "admin" | "assessor" | "gestor";
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  lead_id: string;
  sale_value: number;
  sold_by: string | null;
  sold_at: string;
}

export interface MetaPeriod {
  id: string;
  period_label: string;
  target_value: number;
  start_date: string;
  end_date: string;
}

export interface ChainNode {
  level: number;
  node_type: "user" | "lead";
  node_id: string;
  node_name: string;
}

export interface Referral {
  id: string;
  lead_id: string;
  referrer_type: "user" | "lead";
  referrer_user_id: string | null;
  referrer_lead_id: string | null;
  created_at: string;
}

export interface ReferralChainResult {
  chain: ChainNode[];
  tree_truncated: boolean;
}

// ---- Status mapping (UI <-> API) ----

const STATUS_TO_API: Record<LeadStatus, string> = {
  Novo: "Novo",
  "Em Contato": "Em negociação",
  "Proposta Enviada": "Follow-up",
  Convertido: "Fechado",
  Perdido: "Perdido",
};

const STATUS_FROM_API: Record<string, LeadStatus> = {
  Novo: "Novo",
  "Em negociação": "Em Contato",
  "Em negociacao": "Em Contato",
  "Follow-up": "Proposta Enviada",
  Fechado: "Convertido",
  Perdido: "Perdido",
};

export function toApiStatus(status: LeadStatus): string {
  return STATUS_TO_API[status] ?? status;
}

export function fromApiStatus(status: string | null | undefined): LeadStatus {
  if (!status) return "Novo";
  return STATUS_FROM_API[status] ?? (status as LeadStatus);
}

function mapRole(role: string): Profile["role"] {
  if (role === "ADMIN") return "admin";
  return "assessor";
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// ---- Backend response types ----

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ApiLead {
  id: string;
  externalCode?: string | null;
  name: string;
  phone?: string | null;
  salesStatus?: string | null;
  notes?: string | null;
  assignedToUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiPurchase {
  id: string;
  leadId: string;
  amount: unknown;
  purchaseDate: string;
  createdAt: string;
}

interface ApiGoal {
  id: string;
  targetAmount: unknown;
  currentAmount: unknown;
  startDate: string;
  endDate: string;
}

interface ApiReferral {
  id: string;
  referredLeadId: string;
  referrerType: "USER" | "LEAD";
  referrerId: string;
  referredLeadName?: string;
  referrerName?: string | null;
  createdAt: string;
}

interface ApiTreeNode {
  id: string;
  name: string;
  type: "USER" | "LEAD";
  depth: number;
}

interface ApiTreeResponse {
  ancestors: ApiTreeNode[];
  tree_truncated: boolean;
}

function mapLead(api: ApiLead): Lead {
  return {
    id: api.id,
    name: api.name,
    phone: api.phone ?? "",
    status: fromApiStatus(api.salesStatus),
    notes: api.notes ?? null,
    created_by: api.assignedToUserId ?? null,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  };
}

function mapProfile(api: ApiUser): Profile {
  return {
    id: api.id,
    name: api.name,
    role: mapRole(api.role),
    created_at: api.createdAt,
  };
}

function mapSale(api: ApiPurchase): Sale {
  return {
    id: api.id,
    lead_id: api.leadId,
    sale_value: decimalToNumber(api.amount),
    sold_by: null,
    sold_at: api.purchaseDate,
  };
}

function mapReferral(api: ApiReferral): Referral {
  return {
    id: api.id,
    lead_id: api.referredLeadId,
    referrer_type: api.referrerType === "USER" ? "user" : "lead",
    referrer_user_id: api.referrerType === "USER" ? api.referrerId : null,
    referrer_lead_id: api.referrerType === "LEAD" ? api.referrerId : null,
    created_at: api.createdAt,
  };
}

function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start);
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[s.getMonth()]} ${s.getFullYear()} — ${new Date(end).toLocaleDateString("pt-BR")}`;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Queries ----

export async function fetchLeads(): Promise<Lead[]> {
  const res = await apiFetch<{ data: ApiLead[] }>("/leads?limit=100");
  return res.data.map(mapLead);
}

export async function fetchLead(id: string): Promise<Lead> {
  const res = await apiFetch<{ data: ApiLead }>(`/leads/${id}`);
  return mapLead(res.data);
}

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await apiFetch<{ data: ApiUser[] }>("/users");
  return res.data.map(mapProfile);
}

export async function fetchSales(): Promise<Sale[]> {
  const res = await apiFetch<{ data: ApiPurchase[] }>("/purchases");
  return res.data.map(mapSale);
}

export async function fetchMetaPeriod(): Promise<MetaPeriod | null> {
  const res = await apiFetch<{ data: ApiGoal | null }>("/goals/current");
  if (!res.data) return null;
  const g = res.data;
  return {
    id: g.id,
    period_label: formatPeriodLabel(g.startDate, g.endDate),
    target_value: decimalToNumber(g.targetAmount),
    start_date: g.startDate,
    end_date: g.endDate,
  };
}

export async function fetchReferralChain(leadId: string): Promise<ReferralChainResult> {
  const res = await apiFetch<ApiTreeResponse>(`/leads/${leadId}/tree?maxDepth=10`);
  const chain: ChainNode[] = res.ancestors.map((a) => ({
    level: a.depth,
    node_type: a.type === "USER" ? "user" : "lead",
    node_id: a.id,
    node_name: a.name,
  }));
  return { chain, tree_truncated: res.tree_truncated };
}

export async function fetchReferrals(): Promise<Referral[]> {
  const res = await apiFetch<{ data: ApiReferral[] }>("/referrals");
  return res.data.map(mapReferral);
}

export interface NewLeadInput {
  name: string;
  phone: string;
  status: LeadStatus;
  notes?: string;
  referrer_type?: "user" | "lead" | null;
  referrer_id?: string | null;
  created_by?: string | null;
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    salesStatus: toApiStatus(input.status),
    notes: input.notes?.trim() || undefined,
    assignedToUserId: input.created_by ?? undefined,
  };

  if (input.referrer_type && input.referrer_id) {
    body.referrer = {
      type: input.referrer_type === "user" ? "USER" : "LEAD",
      id: input.referrer_id,
    };
  }

  const res = await apiFetch<{ data: ApiLead }>("/leads", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapLead(res.data);
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<Lead, "name" | "phone" | "status" | "notes">>,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.phone !== undefined) body.phone = patch.phone;
  if (patch.status !== undefined) body.salesStatus = toApiStatus(patch.status);
  if (patch.notes !== undefined) body.notes = patch.notes;

  await apiFetch(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function registerSale(input: {
  lead_id: string;
  sale_value: number;
  sold_by?: string | null;
}): Promise<void> {
  await apiFetch(`/leads/${input.lead_id}/purchases`, {
    method: "POST",
    body: JSON.stringify({
      amount: input.sale_value,
      purchaseDate: new Date().toISOString(),
    }),
  });
}

export interface ImportReport {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  sheetUsed?: string;
}

export interface SheetInfo {
  name: string;
  hasValidHeaders: boolean;
  matchedColumns: number;
  dataRowCount: number;
  isDefault: boolean;
}

export interface ImportPreview {
  sheets: SheetInfo[];
  defaultSheet: string | null;
}

async function buildImportForm(file: File, sheetName?: string): Promise<FormData> {
  const form = new FormData();
  form.append("file", file);
  if (sheetName) form.append("sheetName", sheetName);
  return form;
}

export async function previewImportSheets(file: File): Promise<ImportPreview> {
  const form = await buildImportForm(file);
  return apiFetch<ImportPreview>("/leads/import/preview", {
    method: "POST",
    body: form,
  });
}

export async function importLeadsFromExcel(
  file: File,
  sheetName?: string,
): Promise<ImportReport> {
  const form = await buildImportForm(file, sheetName);
  return apiFetch<ImportReport>("/leads/import", {
    method: "POST",
    body: form,
  });
}
