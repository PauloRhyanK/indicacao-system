import { apiFetch } from "@/lib/api/client";

export interface LookupItem {
  id: string;
  slug: string;
  name: string;
}

export interface Lookups {
  statuses: LookupItem[];
  sources: LookupItem[];
  nextActions: LookupItem[];
  consortiumTypes: LookupItem[];
}

export interface Profile {
  id: string;
  name: string;
  role: "admin" | "assessor" | "gestor";
  created_at: string;
}

export interface AssignedUser {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  external_code: string | null;
  salesStatus: LookupItem | null;
  source: LookupItem | null;
  nextAction: LookupItem | null;
  notes: string | null;
  next_follow_up_at: string | null;
  offered_amount: number | null;
  closed_amount: number | null;
  assigned_to: AssignedUser | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsFilters {
  search?: string;
  status?: string;
  source?: string;
  nextAction?: string;
  assignedTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  offeredMin?: number;
  offeredMax?: number;
  closedMin?: number;
  closedMax?: number;
  notes?: string;
  page?: number;
  limit?: number;
}

export interface LeadsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadsListResult {
  leads: Lead[];
  pagination: LeadsPagination;
}

export interface Sale {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string | null;
  sale_value: number;
  consortium_type: string | null;
  sold_at: string;
}

export interface MetaPeriod {
  id: string;
  period_label: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
}

export type DailyPresetSlug = "normal" | "peak" | "reduced" | "sprint";

export interface DailyGoalPreset {
  slug: DailyPresetSlug;
  label: string;
  multiplier: number;
}

export interface DailyGoalDefault {
  weekday: number;
  amount: number;
}

export interface DailyGoalOverride {
  date: string;
  amount: number | null;
  presetSlug: DailyPresetSlug | null;
}

export interface DailyGoalToday {
  date: string;
  weekday: number;
  baseAmount: number;
  presetSlug: DailyPresetSlug;
  presetLabel: string;
  presetMultiplier: number;
  target: number;
  current: number;
  percent: number;
  hasOverride: boolean;
  overrideAmount: number | null;
  periodGoal: {
    id: string;
    targetAmount: number;
    currentAmount: number;
    startDate: string;
    endDate: string;
  } | null;
  presets: DailyGoalPreset[];
  todaySalesCount: number;
  recentSales: {
    id: string;
    leadName: string;
    sellerName: string;
    saleValue: number;
    soldAt: string;
  }[];
}

export interface PersonalDashboardSale {
  id: string;
  leadName: string;
  consortiumType: string | null;
  amount: number;
  soldAt: string;
}

export interface PersonalDashboardLead {
  id: string;
  name: string;
  statusName: string;
  statusSlug: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
}

export interface PersonalDashboard {
  personalDailyTarget: number | null;
  companyDailyTarget: number;
  resolvedDailyTarget: number;
  targetSource: "personal" | "company";
  mySalesToday: number;
  mySalesTodayCount: number;
  dailyPercent: number;
  remaining: number;
  streakDays: number;
  rankPosition: number | null;
  rankTotal: number;
  activeLeadsCount: number;
  followUpLeadsCount: number;
  myConversionRate: number;
  teamAvgConversionRate: number;
  avgTicket: number;
  todaySales: PersonalDashboardSale[];
  activeLeads: PersonalDashboardLead[];
  insight: {
    remaining: number;
    avgTicket: number;
    followUpCount: number;
    message: string;
  };
}

export interface ChainNode {
  level: number;
  node_type: "user" | "lead";
  node_id: string;
  node_name: string;
}

export interface BonusChainNode {
  level: number;
  nodeType: "USER" | "LEAD";
  nodeId: string;
  name: string;
  phone: string | null;
}

export interface BonusChainResult {
  chain: BonusChainNode[];
  tree_truncated: boolean;
}

export interface ApiPurchase {
  id: string;
  leadId: string;
  amount: unknown;
  purchaseDate: string;
  createdAt: string;
  consortiumType?: ApiLookup | null;
  lead?: { id: string; name: string; phone: string | null } | null;
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

function mapRole(role: string): Profile["role"] {
  if (role === "ADMIN") return "admin";
  return "assessor";
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

interface ApiLookup {
  id: string;
  slug: string;
  name: string;
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ApiAssignedUser {
  id: string;
  name: string;
  email?: string;
}

interface ApiLead {
  id: string;
  externalCode?: string | null;
  name: string;
  phone?: string | null;
  salesStatus?: ApiLookup | null;
  source?: ApiLookup | null;
  nextAction?: ApiLookup | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
  offeredAmount?: unknown | null;
  closedAmount?: unknown | null;
  assignedTo?: ApiAssignedUser | null;
  assignedToUserId?: string | null;
  createdAt: string;
  updatedAt: string;
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

function mapLookup(item?: ApiLookup | null): LookupItem | null {
  if (!item) return null;
  return { id: item.id, slug: item.slug, name: item.name };
}

function mapAssignedTo(api: ApiLead): AssignedUser | null {
  if (api.assignedTo) return { id: api.assignedTo.id, name: api.assignedTo.name };
  return null;
}

function mapLead(api: ApiLead): Lead {
  const assigned = mapAssignedTo(api);
  return {
    id: api.id,
    name: api.name,
    phone: api.phone ?? "",
    external_code: api.externalCode ?? null,
    salesStatus: mapLookup(api.salesStatus),
    source: mapLookup(api.source),
    nextAction: mapLookup(api.nextAction),
    notes: api.notes ?? null,
    next_follow_up_at: api.nextFollowUpAt ?? null,
    offered_amount: api.offeredAmount != null ? decimalToNumber(api.offeredAmount) : null,
    closed_amount: api.closedAmount != null ? decimalToNumber(api.closedAmount) : null,
    assigned_to: assigned,
    created_by: assigned?.id ?? api.assignedToUserId ?? null,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  };
}

function buildLeadsQuery(filters?: LeadsFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "?limit=100";
  const entries: [string, string | number | undefined][] = [
    ["page", filters.page],
    ["limit", filters.limit ?? 50],
    ["search", filters.search],
    ["status", filters.status],
    ["source", filters.source],
    ["nextAction", filters.nextAction],
    ["assignedTo", filters.assignedTo],
    ["followUpFrom", filters.followUpFrom],
    ["followUpTo", filters.followUpTo],
    ["createdFrom", filters.createdFrom],
    ["createdTo", filters.createdTo],
    ["updatedFrom", filters.updatedFrom],
    ["updatedTo", filters.updatedTo],
    ["offeredMin", filters.offeredMin],
    ["offeredMax", filters.offeredMax],
    ["closedMin", filters.closedMin],
    ["closedMax", filters.closedMax],
    ["notes", filters.notes],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
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
    lead_name: api.lead?.name ?? "—",
    lead_phone: api.lead?.phone ?? null,
    sale_value: decimalToNumber(api.amount),
    consortium_type: api.consortiumType?.name ?? null,
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
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isLeadClosed(lead: Lead): boolean {
  return lead.salesStatus?.slug === "fechado";
}

// ---- Lookups ----

export async function fetchLookups(): Promise<Lookups> {
  const res = await apiFetch<{ data: Lookups }>("/settings/lookups");
  return res.data;
}

export type LookupType = "status" | "source" | "action" | "consortium";

const LOOKUP_ROUTES: Record<LookupType, string> = {
  status: "lead-statuses",
  source: "lead-sources",
  action: "next-actions",
  consortium: "consortium-types",
};

export async function createLookup(type: LookupType, name: string): Promise<LookupItem> {
  const res = await apiFetch<{ data: LookupItem }>(`/settings/${LOOKUP_ROUTES[type]}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function updateLookup(
  type: LookupType,
  id: string,
  name: string,
): Promise<LookupItem> {
  const res = await apiFetch<{ data: LookupItem }>(`/settings/${LOOKUP_ROUTES[type]}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function deleteLookup(type: LookupType, id: string): Promise<void> {
  await apiFetch(`/settings/${LOOKUP_ROUTES[type]}/${id}`, { method: "DELETE" });
}

// ---- Queries ----

export async function fetchLeads(filters?: LeadsFilters): Promise<LeadsListResult> {
  const res = await apiFetch<{ data: ApiLead[]; pagination: LeadsPagination }>(
    `/leads${buildLeadsQuery(filters)}`,
  );
  return {
    leads: res.data.map(mapLead),
    pagination: res.pagination,
  };
}

/** Atalho para telas que precisam de todos os leads (até 100). */
export async function fetchAllLeads(): Promise<Lead[]> {
  const { leads } = await fetchLeads({ limit: 100 });
  return leads;
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
    current_value: decimalToNumber(g.currentAmount),
    start_date: g.startDate,
    end_date: g.endDate,
  };
}

export async function updateGoalPeriod(
  id: string,
  patch: Partial<{ target_value: number; start_date: string; end_date: string }>,
): Promise<void> {
  await apiFetch(`/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(patch.target_value !== undefined ? { targetAmount: patch.target_value } : {}),
      ...(patch.start_date !== undefined ? { startDate: patch.start_date } : {}),
      ...(patch.end_date !== undefined ? { endDate: patch.end_date } : {}),
    }),
  });
}

export async function fetchDailyGoalToday(): Promise<DailyGoalToday> {
  const res = await apiFetch<{ data: DailyGoalToday }>("/goals/daily/today", {}, false);
  return res.data;
}

export async function fetchPersonalDashboard(): Promise<PersonalDashboard> {
  const res = await apiFetch<{ data: PersonalDashboard }>("/dashboard/personal");
  return res.data;
}

export async function updatePersonalDailyTarget(amount: number | null): Promise<number | null> {
  const res = await apiFetch<{ data: { amount: number | null } }>(
    "/users/me/personal-daily-target",
    {
      method: "PATCH",
      body: JSON.stringify({ amount }),
    },
  );
  return res.data.amount;
}

export async function fetchDailyDefaults(): Promise<DailyGoalDefault[]> {
  const res = await apiFetch<{ data: DailyGoalDefault[] }>("/goals/daily/defaults");
  return res.data;
}

export async function saveDailyDefaults(defaults: DailyGoalDefault[]): Promise<DailyGoalDefault[]> {
  const res = await apiFetch<{ data: DailyGoalDefault[] }>("/goals/daily/defaults", {
    method: "PUT",
    body: JSON.stringify({ defaults }),
  });
  return res.data;
}

export async function fetchDailyOverrides(month: string): Promise<DailyGoalOverride[]> {
  const res = await apiFetch<{ data: DailyGoalOverride[] }>(
    `/goals/daily/overrides?month=${encodeURIComponent(month)}`,
  );
  return res.data;
}

export async function saveDailyOverride(
  date: string,
  patch: { amount?: number; presetSlug?: DailyPresetSlug },
): Promise<DailyGoalOverride> {
  const res = await apiFetch<{ data: DailyGoalOverride }>(`/goals/daily/overrides/${date}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function deleteDailyOverride(date: string): Promise<void> {
  await apiFetch(`/goals/daily/overrides/${date}`, { method: "DELETE" });
}

export async function applyDailyPresetToday(
  presetSlug: DailyPresetSlug,
  tvToken?: string,
): Promise<DailyGoalToday> {
  const headers: Record<string, string> = {};
  if (tvToken) headers["X-TV-Token"] = tvToken;

  const res = await apiFetch<{ data: DailyGoalToday }>(
    "/goals/daily/today/preset",
    {
      method: "POST",
      body: JSON.stringify({ presetSlug }),
      headers,
    },
    !tvToken,
  );
  return res.data;
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
  salesStatusSlug?: string;
  sourceSlug?: string;
  nextActionSlug?: string;
  notes?: string;
  referrer_type?: "user" | "lead" | null;
  referrer_id?: string | null;
  created_by?: string | null;
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    salesStatusSlug: input.salesStatusSlug,
    sourceSlug: input.sourceSlug,
    nextActionSlug: input.nextActionSlug,
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
  patch: Partial<{
    name: string;
    phone: string;
    salesStatusSlug: string;
    sourceSlug: string;
    nextActionSlug: string;
    nextFollowUpAt: string;
    notes: string;
  }>,
): Promise<void> {
  await apiFetch(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

interface ApiRegisterSaleResponse {
  purchase: ApiPurchase;
  bonusChain: {
    level: number;
    nodeType: "USER" | "LEAD";
    nodeId: string;
    name: string;
    phone: string | null;
  }[];
  tree_truncated: boolean;
}

export interface RegisterSaleResult extends BonusChainResult {
  purchaseId: string;
  leadId: string;
}

export async function registerSale(input: {
  lead_id: string;
  sale_value: number;
  consortium_type_id?: string;
  sold_by?: string | null;
}): Promise<RegisterSaleResult> {
  const res = await apiFetch<{ data: ApiRegisterSaleResponse }>(
    `/leads/${input.lead_id}/purchases`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.sale_value,
        purchaseDate: new Date().toISOString(),
        consortiumTypeId: input.consortium_type_id,
      }),
    },
  );
  return {
    purchaseId: res.data.purchase.id,
    leadId: input.lead_id,
    chain: res.data.bonusChain,
    tree_truncated: res.data.tree_truncated,
  };
}

export async function fetchBonusChain(leadId: string): Promise<BonusChainResult> {
  const res = await apiFetch<{ data: BonusChainResult }>(
    `/leads/${leadId}/bonus-chain?maxDepth=10`,
  );
  return res.data;
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

export interface UnknownValues {
  statuses: string[];
  sources: string[];
  nextActions: string[];
}

export interface ImportPreview {
  sheets: SheetInfo[];
  defaultSheet: string | null;
  unknownValues: UnknownValues;
  canImport: boolean;
}

export type MappingAction =
  | { action: "map"; targetSlug: string }
  | { action: "create"; name: string };

export interface ImportMappings {
  statuses?: Record<string, MappingAction>;
  sources?: Record<string, MappingAction>;
  nextActions?: Record<string, MappingAction>;
}

async function buildImportForm(
  file: File,
  sheetName?: string,
  mappings?: ImportMappings,
): Promise<FormData> {
  const form = new FormData();
  form.append("file", file);
  if (sheetName) form.append("sheetName", sheetName);
  if (mappings && Object.keys(mappings).length > 0) {
    form.append("mappings", JSON.stringify(mappings));
  }
  return form;
}

export async function previewImportSheets(
  file: File,
  sheetName?: string,
): Promise<ImportPreview> {
  const form = await buildImportForm(file, sheetName);
  return apiFetch<ImportPreview>("/leads/import/preview", {
    method: "POST",
    body: form,
  });
}

export async function importLeadsFromExcel(
  file: File,
  sheetName?: string,
  mappings?: ImportMappings,
): Promise<ImportReport> {
  const form = await buildImportForm(file, sheetName, mappings);
  return apiFetch<ImportReport>("/leads/import", {
    method: "POST",
    body: form,
  });
}
