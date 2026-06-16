import { apiFetch, getApiBaseUrl, getToken } from "@/lib/api/client";

export interface LookupItem {
  id: string;
  slug: string;
  name: string;
}

export interface Lookups {
  statuses: LookupItem[];
  consortiumTypes: LookupItem[];
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  must_change_password: boolean;
  roles: { id: string; name: string; isSystem: boolean }[];
  created_at: string;
}

export interface AssignedUser {
  id: string;
  name: string;
}

export interface LeadReferrer {
  type: "user" | "lead";
  id: string;
  name: string;
}

export type OpportunityGrade = "BAIXO" | "MEDIO" | "ALTO" | "EXTREMO";

export const OPPORTUNITY_GRADE_LABELS: Record<OpportunityGrade, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  EXTREMO: "Extremo",
};

export function formatOpportunityGrade(
  grade: OpportunityGrade | null | undefined,
): string {
  if (!grade) return "—";
  return OPPORTUNITY_GRADE_LABELS[grade];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  external_code: string | null;
  salesStatus: LookupItem | null;
  opportunity_grade: OpportunityGrade | null;
  notes: string | null;
  offered_amount: number | null;
  closed_amount: number | null;
  responsavel: AssignedUser | null;
  co_vendedor: AssignedUser | null;
  created_by: AssignedUser | null;
  first_contact: AssignedUser | null;
  referrer: LeadReferrer | null;
  created_at: string;
  updated_at: string;
}

export interface SaleCommercialRoles {
  responsavel: AssignedUser | null;
  co_vendedor: AssignedUser | null;
  external_code: string | null;
}

export interface LeadsFilters {
  search?: string;
  status?: string;
  responsavelId?: string;
  unassigned?: boolean;
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
  lead_created_at: string | null;
  lead_notes: string | null;
  sale_value: number;
  consortium_type: string | null;
  consortium_type_id: string | null;
  sold_at: string;
  boleto_paid: boolean;
  commercial: SaleCommercialRoles;
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
  currentPending: number;
  percent: number;
  hasOverride: boolean;
  overrideAmount: number | null;
  periodGoal: {
    id: string;
    targetAmount: number;
    currentAmount: number;
    currentPending: number;
    startDate: string;
    endDate: string;
  } | null;
  presets: DailyGoalPreset[];
  todaySalesCount: number;
  todayPaidSalesCount: number;
  recentSales: {
    id: string;
    leadName: string;
    sellerName: string;
    saleValue: number;
    soldAt: string;
    boletoPaid: boolean;
  }[];
  salesRanking: {
    position: number;
    userId: string;
    name: string;
    total: number;
    pendingTotal: number;
    count: number;
    pendingCount: number;
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
  boletoPaid?: boolean;
  createdAt: string;
  consortiumType?: ApiLookup | null;
  responsavel?: ApiAssignedUser | null;
  lead?: {
    id: string;
    name: string;
    phone: string | null;
    externalCode?: string | null;
    createdAt?: string;
    notes?: string | null;
    responsavel?: ApiAssignedUser | null;
    coVendedor?: ApiAssignedUser | null;
  } | null;
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

function mapProfile(api: ApiUser): Profile {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    must_change_password: api.mustChangePassword ?? false,
    roles: api.roles ?? [],
    created_at: api.createdAt,
  };
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
  mustChangePassword?: boolean;
  roles: { id: string; name: string; isSystem: boolean }[];
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
  opportunityGrade?: OpportunityGrade | null;
  notes?: string | null;
  offeredAmount?: unknown | null;
  closedAmount?: unknown | null;
  assignedTo?: ApiAssignedUser | null;
  assignedToUserId?: string | null;
  responsavel?: ApiAssignedUser | null;
  coVendedor?: ApiAssignedUser | null;
  createdBy?: ApiAssignedUser | null;
  firstContact?: ApiAssignedUser | null;
  responsavelId?: string | null;
  coVendedorId?: string | null;
  referrer?: { type: "USER" | "LEAD"; id: string; name: string } | null;
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

function mapUserRef(user?: ApiAssignedUser | null): AssignedUser | null {
  if (!user) return null;
  return { id: user.id, name: user.name };
}

function mapLeadReferrer(
  ref?: { type: "USER" | "LEAD"; id: string; name: string } | null,
): LeadReferrer | null {
  if (!ref) return null;
  return {
    type: ref.type === "USER" ? "user" : "lead",
    id: ref.id,
    name: ref.name,
  };
}

function mapLead(api: ApiLead): Lead {
  const responsavel =
    mapUserRef(api.responsavel) ?? mapUserRef(api.assignedTo);
  return {
    id: api.id,
    name: api.name,
    phone: api.phone ?? "",
    external_code: api.externalCode ?? null,
    salesStatus: mapLookup(api.salesStatus),
    opportunity_grade: api.opportunityGrade ?? null,
    notes: api.notes ?? null,
    offered_amount: api.offeredAmount != null ? decimalToNumber(api.offeredAmount) : null,
    closed_amount: api.closedAmount != null ? decimalToNumber(api.closedAmount) : null,
    responsavel,
    co_vendedor: mapUserRef(api.coVendedor),
    created_by: mapUserRef(api.createdBy),
    first_contact: mapUserRef(api.firstContact),
    referrer: mapLeadReferrer(api.referrer),
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
    ["responsavelId", filters.responsavelId],
    ["unassigned", filters.unassigned === true ? "true" : undefined],
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

/** Datas só com dia (YYYY-MM-DD ou meia-noite UTC) usam o prefixo como dia civil. */
function extractCalendarDateIso(value: string): string | null {
  const trimmed = value.trim();
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
  if (dateOnly) return dateOnly[1];
  const utcMidnight = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/.exec(trimmed);
  if (utcMidnight) return utcMidnight[1];
  return null;
}

export function businessDateKey(date: Date | string): string {
  if (typeof date === "string") {
    const calendar = extractCalendarDateIso(date);
    if (calendar) return calendar;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function isSaleTodayInBusinessTz(iso: string): boolean {
  return businessDateKey(iso) === businessDateKey(new Date());
}

function mapSale(api: ApiPurchase): Sale {
  const lead = api.lead;
  return {
    id: api.id,
    lead_id: api.leadId,
    lead_name: lead?.name ?? "—",
    lead_phone: lead?.phone ?? null,
    lead_created_at: lead?.createdAt ?? null,
    lead_notes: lead?.notes ?? null,
    sale_value: decimalToNumber(api.amount),
    consortium_type: api.consortiumType?.name ?? null,
    consortium_type_id: api.consortiumType?.id ?? null,
    sold_at: api.purchaseDate,
    boleto_paid: api.boletoPaid ?? false,
    commercial: {
      responsavel: mapUserRef(api.responsavel) ?? mapUserRef(lead?.responsavel),
      co_vendedor: mapUserRef(lead?.coVendedor),
      external_code: lead?.externalCode ?? null,
    },
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

export type LookupType = "status" | "consortium";

const LOOKUP_ROUTES: Record<LookupType, string> = {
  status: "lead-statuses",
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

export async function updateSale(
  id: string,
  patch: {
    sale_date?: string;
    boleto_paid?: boolean;
    sale_value?: number;
    consortium_type_id?: string | null;
  },
): Promise<{ sale: Sale; stalePaidRewards: number }> {
  const body: Record<string, unknown> = {};
  if (patch.sale_date) body.purchaseDate = toPurchaseDateIso(patch.sale_date);
  if (patch.boleto_paid !== undefined) body.boletoPaid = patch.boleto_paid;
  if (patch.sale_value !== undefined) body.amount = patch.sale_value;
  if (patch.consortium_type_id !== undefined) {
    body.consortiumTypeId = patch.consortium_type_id;
  }

  const res = await apiFetch<{ data: ApiPurchase; stalePaidRewards?: number }>(
    `/purchases/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return {
    sale: mapSale(res.data),
    stalePaidRewards: res.stalePaidRewards ?? 0,
  };
}

export async function deleteSale(
  id: string,
  options: { leadStatusSlug: string },
): Promise<void> {
  await apiFetch(`/purchases/${id}`, {
    method: "DELETE",
    body: JSON.stringify(options),
  });
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
  notes?: string;
  offered_amount?: number | null;
  referrer_type?: "user" | "lead" | null;
  referrer_id?: string | null;
  responsavel_id?: string | null;
  co_vendedor_id?: string | null;
  first_contact_id?: string | null;
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    salesStatusSlug: input.salesStatusSlug,
    notes: input.notes?.trim() || undefined,
    responsavelId: input.responsavel_id ?? undefined,
    coVendedorId: input.co_vendedor_id ?? undefined,
    firstContactId: input.first_contact_id ?? undefined,
    ...(input.offered_amount != null ? { offeredAmount: input.offered_amount } : {}),
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
    opportunityGrade: OpportunityGrade | null;
    notes: string;
    responsavelId: string | null;
    coVendedorId: string | null;
    firstContactId: string | null;
    offeredAmount: number | null;
    referrer: { type: "USER" | "LEAD"; id: string } | null;
  }>,
): Promise<void> {
  await apiFetch(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteLead(id: string): Promise<void> {
  await apiFetch(`/leads/${id}`, { method: "DELETE" });
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

function toPurchaseDateIso(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

export async function registerSale(input: {
  lead_id: string;
  sale_value: number;
  sale_date?: string;
  consortium_type_id?: string;
  co_vendedor_id?: string | null;
  boleto_paid?: boolean;
}): Promise<RegisterSaleResult> {
  const purchaseDate = input.sale_date
    ? toPurchaseDateIso(input.sale_date)
    : toPurchaseDateIso(new Date().toISOString().slice(0, 10));

  const res = await apiFetch<{ data: ApiRegisterSaleResponse }>(
    `/leads/${input.lead_id}/purchases`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.sale_value,
        purchaseDate,
        consortiumTypeId: input.consortium_type_id,
        coVendedorId: input.co_vendedor_id,
        boletoPaid: input.boleto_paid ?? false,
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

export type CampaignRewardType =
  | "RESPONSAVEL"
  | "CO_VENDEDOR"
  | "FIRST_CONTACT"
  | "REFERRAL"
  | "CLIENT";

export type ClientRewardChoice = "CASHBACK" | "TRAVEL_VOUCHER";

export type CampaignRewardStatus = "PENDING" | "PAID" | "CANCELLED";

export interface CampaignReward {
  id: string;
  purchaseId: string;
  type: CampaignRewardType;
  referralLevel: number;
  recipientType: "USER" | "LEAD" | null;
  recipientId: string | null;
  recipientName: string;
  amount: number | null;
  clientChoice: ClientRewardChoice | null;
  status: CampaignRewardStatus;
  amountStale: boolean;
  paidAt: string | null;
  notes: string | null;
}

export interface PurchaseRewardsSummary {
  purchaseId: string;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  purchaseAmount: number;
  purchaseDate: string;
  directReferrerName: string | null;
  rewardsGenerated: boolean;
  totalRewards: number;
  paidCount: number;
  pendingCount: number;
  staleCount: number;
  rewards: CampaignReward[];
}

export interface CampaignRewardsListResult {
  items: PurchaseRewardsSummary[];
  pagination: LeadsPagination;
  backfillRemaining: number;
}

export const REWARD_TYPE_LABELS: Record<CampaignRewardType, string> = {
  RESPONSAVEL: "Vendedor responsável",
  CO_VENDEDOR: "Co-vendedor",
  FIRST_CONTACT: "Primeiro contato",
  REFERRAL: "Indicação",
  CLIENT: "Cliente",
};

export const CLIENT_CHOICE_LABELS: Record<ClientRewardChoice, string> = {
  CASHBACK: "Cashback (1ª parcela)",
  TRAVEL_VOUCHER: "Voucher de viagens",
};

/** Recompensas exibidas na campanha (sem legado FIRST_CONTACT nem canceladas). */
export function getVisibleCampaignRewards(rewards: CampaignReward[]): CampaignReward[] {
  return rewards.filter(
    (r) => r.status !== "CANCELLED" && r.type !== "FIRST_CONTACT",
  );
}

export function getCampaignRewardCounts(rewards: CampaignReward[]) {
  const visible = getVisibleCampaignRewards(rewards);
  return {
    totalRewards: visible.length,
    paidCount: visible.filter((r) => r.status === "PAID").length,
    pendingCount: visible.filter((r) => r.status === "PENDING").length,
    staleCount: visible.filter((r) => r.amountStale).length,
  };
}

function mapCampaignReward(api: CampaignReward): CampaignReward {
  return api;
}

function mapPurchaseRewardsSummary(api: PurchaseRewardsSummary): PurchaseRewardsSummary {
  const rewards = api.rewards.map(mapCampaignReward);
  const visible = getVisibleCampaignRewards(rewards);
  return {
    ...api,
    ...getCampaignRewardCounts(rewards),
    rewardsGenerated: visible.length > 0,
    rewards: visible,
  };
}

export async function fetchCampaignRewards(params?: {
  page?: number;
  limit?: number;
  pendingOnly?: boolean;
  hasReferral?: boolean;
  includeWithoutRewards?: boolean;
}): Promise<CampaignRewardsListResult> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.pendingOnly) search.set("pendingOnly", "true");
  if (params?.hasReferral) search.set("hasReferral", "true");
  if (params?.includeWithoutRewards) search.set("includeWithoutRewards", "true");
  const qs = search.toString();
  const res = await apiFetch<CampaignRewardsListResult>(
    `/campaign-rewards${qs ? `?${qs}` : ""}`,
  );
  return {
    ...res,
    items: res.items.map(mapPurchaseRewardsSummary),
  };
}

export async function fetchPurchaseCampaignRewards(
  purchaseId: string,
): Promise<PurchaseRewardsSummary> {
  const res = await apiFetch<{ data: PurchaseRewardsSummary }>(
    `/purchases/${purchaseId}/campaign-rewards`,
  );
  return mapPurchaseRewardsSummary(res.data);
}

export async function updateCampaignReward(
  id: string,
  patch: {
    status?: CampaignRewardStatus;
    clientChoice?: ClientRewardChoice | null;
    notes?: string | null;
  },
): Promise<CampaignReward> {
  const res = await apiFetch<{ data: CampaignReward }>(`/campaign-rewards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return mapCampaignReward(res.data);
}

export async function bulkMarkCampaignRewardsPaid(ids: string[]): Promise<CampaignReward[]> {
  const res = await apiFetch<{ data: CampaignReward[] }>("/campaign-rewards/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, status: "PAID" }),
  });
  return res.data.map(mapCampaignReward);
}

export async function backfillCampaignRewards(
  limit = 100,
): Promise<{ processed: number; remaining: number; errors: { purchaseId: string; message: string }[] }> {
  return apiFetch("/campaign-rewards/backfill", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
}

export async function generatePurchaseCampaignRewards(
  purchaseId: string,
): Promise<PurchaseRewardsSummary> {
  const res = await apiFetch<{ data: PurchaseRewardsSummary }>(
    `/purchases/${purchaseId}/campaign-rewards/backfill`,
    { method: "POST" },
  );
  return mapPurchaseRewardsSummary(res.data);
}

export interface ImportRowDetail {
  row: number;
  name: string;
  externalCode?: string | null;
  phone?: string | null;
  leadId?: string;
}

export interface ImportUpdateDetail extends ImportRowDetail {
  changes: string[];
  matchedBy?: "externalCode" | "phone";
}

export interface ImportIssueDetail {
  row: number;
  name?: string | null;
  message: string;
}

export interface ImportCreatedUserDetail {
  name: string;
  email: string;
  sheetAliases: string[];
}

export interface ImportReport {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportIssueDetail[];
  sheetUsed?: string;
  created: ImportRowDetail[];
  updates: ImportUpdateDetail[];
  ignored: ImportIssueDetail[];
  createdUsers?: ImportCreatedUserDetail[];
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

export type UserMappingAction =
  | { action: "map"; userId: string }
  | { action: "create"; name: string };

export interface ImportMappings {
  statuses?: Record<string, MappingAction>;
  users?: Record<string, UserMappingAction>;
}

export interface ConsorcioUnknownValues {
  users: string[];
}

export interface ConsorcioImportPreview {
  sheets: SheetInfo[];
  defaultSheet: string | null;
  unknownValues: ConsorcioUnknownValues;
  suggestedUserMappings: Record<string, { userId: string; userName: string }>;
  dataRowCount: number;
  sellerNames: string[];
  canImport: boolean;
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

export async function downloadLeadsImportTemplate(): Promise<void> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBaseUrl()}/leads/import/template`, { headers });
  if (!res.ok) {
    const text = await res.text();
    let message = `Erro HTTP ${res.status}`;
    try {
      const payload = JSON.parse(text) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modelo-leads.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
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

async function buildConsorcioImportForm(
  file: File,
  purchaseDate: string,
  sheetName?: string,
  mappings?: ImportMappings,
): Promise<FormData> {
  const form = new FormData();
  form.append("file", file);
  form.append("purchaseDate", purchaseDate);
  if (sheetName) form.append("sheetName", sheetName);
  if (mappings?.users && Object.keys(mappings.users).length > 0) {
    form.append("mappings", JSON.stringify({ users: mappings.users }));
  }
  return form;
}

export async function previewConsorcioImport(
  file: File,
  sheetName?: string,
): Promise<ConsorcioImportPreview> {
  const form = await buildImportForm(file, sheetName);
  return apiFetch<ConsorcioImportPreview>("/purchases/import/preview", {
    method: "POST",
    body: form,
  });
}

export async function importConsorcioFromExcel(
  file: File,
  purchaseDate: string,
  sheetName?: string,
  mappings?: ImportMappings,
): Promise<ImportReport> {
  const form = await buildConsorcioImportForm(file, purchaseDate, sheetName, mappings);
  return apiFetch<ImportReport>("/purchases/import", {
    method: "POST",
    body: form,
  });
}

export interface PermissionDef {
  key: string;
  label: string;
  description?: string;
  groupName: string;
}

export interface PermissionGroup {
  groupName: string;
  permissions: PermissionDef[];
}

export interface RoleSummary {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
  permissionKeys: string[];
  userCount: number;
}

export async function fetchPermissionsCatalog(): Promise<PermissionGroup[]> {
  const res = await apiFetch<{ data: PermissionGroup[] }>("/permissions/catalog");
  return res.data;
}

export async function fetchRoles(): Promise<RoleSummary[]> {
  const res = await apiFetch<{ data: RoleSummary[] }>("/roles");
  return res.data;
}

export async function createRole(name: string): Promise<RoleSummary> {
  const res = await apiFetch<{ data: RoleSummary }>("/roles", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function updateRoleName(id: string, name: string): Promise<void> {
  await apiFetch(`/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/roles/${id}`, { method: "DELETE" });
}

export async function updateRolePermissions(
  id: string,
  permissionKeys: string[],
): Promise<RoleSummary> {
  const res = await apiFetch<{ data: RoleSummary }>(`/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionKeys }),
  });
  return res.data;
}

export async function updateUserRoles(
  userId: string,
  roleIds: string[],
): Promise<{ id: string; name: string; isSystem: boolean }[]> {
  const res = await apiFetch<{
    data: { id: string; name: string; isSystem: boolean }[];
  }>(`/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roleIds }),
  });
  return res.data;
}

export async function createTeamUser(input: {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}): Promise<Profile> {
  const res = await apiFetch<{ data: ApiUser }>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapProfile(res.data);
}

export async function deleteUser(id: string): Promise<{ linkedLeads: number }> {
  const res = await apiFetch<{ data: { linkedLeads: number } }>(`/users/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function requireUserPasswordSetup(
  userId: string,
): Promise<{ alreadyPending: boolean }> {
  const res = await apiFetch<{ data: { alreadyPending: boolean } }>(
    `/users/${userId}/require-password-setup`,
    { method: "PATCH" },
  );
  return res.data;
}

// ——— Recuperação Judicial (credores MG2) ———

export type RjStatus =
  | "confirmado"
  | "juridico"
  | "negociacao"
  | "semcontato"
  | "recusou";

export type RjClasse = "I" | "II" | "III" | "IV";

export type RjMotivo =
  | "fiduciaria"
  | "leasing"
  | "reserva"
  | "acc"
  | "extra"
  | "outro";

export interface RjCredor {
  id: string;
  nome: string;
  sujeito: boolean;
  classe: RjClasse | null;
  motivo: RjMotivo | null;
  valor: number;
  status: RjStatus;
  contato: string;
  passo: string;
  retorno: string | null;
  obs: string;
  created_at: string;
  updated_at: string;
}

export interface RjKpis {
  count: number;
  votam: number;
  foraCount: number;
  confCount: number;
  confPct: number | null;
  votoTotal: number;
  votoConf: number;
  votoConfCount: number;
  foraTotal: number;
}

export interface RjClassAgg {
  valor: number;
  count: number;
}

export interface RjClasses {
  I: RjClassAgg;
  II: RjClassAgg;
  III: RjClassAgg;
  IV: RjClassAgg;
  fora: RjClassAgg;
}

export interface RjConfig {
  passivo: number;
  updated_at: string;
}

export interface RjRepresentatividade {
  confPct: number | null;
  pendPct: number | null;
}

export interface RjCredoresResponse {
  credores: RjCredor[];
  kpis: RjKpis;
  classes: RjClasses;
  config: RjConfig;
  representatividade: RjRepresentatividade;
}

export interface RjCredorInput {
  nome: string;
  sujeito: boolean;
  classe?: RjClasse | null;
  motivo?: RjMotivo | null;
  valor?: number;
  status?: RjStatus;
  contato?: string;
  passo?: string;
  retorno?: string | null;
  obs?: string;
}

export async function fetchRjCredores(): Promise<RjCredoresResponse> {
  const res = await apiFetch<{ data: RjCredoresResponse }>("/rj/credores");
  return res.data;
}

export async function createRjCredor(input: RjCredorInput): Promise<RjCredor> {
  const res = await apiFetch<{ data: RjCredor }>("/rj/credores", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateRjCredor(
  id: string,
  input: Partial<RjCredorInput>,
): Promise<RjCredor> {
  const res = await apiFetch<{ data: RjCredor }>(`/rj/credores/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateRjCredorStatus(
  id: string,
  status: RjStatus,
): Promise<RjCredor> {
  const res = await apiFetch<{ data: RjCredor }>(`/rj/credores/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteRjCredor(id: string): Promise<void> {
  await apiFetch(`/rj/credores/${id}`, { method: "DELETE" });
}

export async function getRjConfig(): Promise<RjConfig> {
  const res = await apiFetch<{ data: RjConfig }>("/rj/config");
  return res.data;
}

export async function updateRjConfig(passivo: number): Promise<RjConfig> {
  const res = await apiFetch<{ data: RjConfig }>("/rj/config", {
    method: "PUT",
    body: JSON.stringify({ passivo }),
  });
  return res.data;
}

export type RjAuditEntityType = "credor" | "config" | "usuario" | "papel";
export type RjAuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reset_password"
  | "role_change";

export interface RjAuditChange {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface RjAuditLogEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  entityType: RjAuditEntityType;
  entityId: string;
  entityLabel: string;
  action: RjAuditAction;
  summary: string;
  changes: RjAuditChange[] | null;
}

export interface RjHistoricoResponse {
  items: RjAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface RjHistoricoFilters {
  page?: number;
  limit?: number;
  entityType?: RjAuditEntityType;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export async function fetchRjHistorico(
  filters: RjHistoricoFilters = {},
): Promise<RjHistoricoResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  const res = await apiFetch<{ data: RjHistoricoResponse }>(
    `/rj/historico${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function fetchRjCredorHistorico(
  credorId: string,
  filters: Omit<RjHistoricoFilters, "entityType" | "entityId"> = {},
): Promise<RjHistoricoResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  const res = await apiFetch<{ data: RjHistoricoResponse }>(
    `/rj/credores/${credorId}/historico${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function downloadRjCredoresCsv(): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/rj/credores/export/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Erro HTTP ${res.status}`;
    try {
      const payload = JSON.parse(text) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "condominio_credores_mg2.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export interface ConfidencialUser {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  accessScope: "CONFIDENCIAL";
  confidencialApprovedAt: string | null;
  isApproved: boolean;
  createdAt: string;
  roles: { id: string; name: string; isSystem: boolean }[];
}

export async function fetchConfidencialUsers(): Promise<ConfidencialUser[]> {
  const res = await apiFetch<{ data: ConfidencialUser[] }>("/rj/usuarios");
  return res.data;
}

export async function createConfidencialUser(input: {
  name: string;
  email: string;
  roleIds?: string[];
}): Promise<ConfidencialUser> {
  const res = await apiFetch<{ data: ConfidencialUser }>("/rj/usuarios", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteConfidencialUser(id: string): Promise<void> {
  await apiFetch(`/rj/usuarios/${id}`, { method: "DELETE" });
}

export async function approveConfidencialUser(id: string): Promise<ConfidencialUser> {
  const res = await apiFetch<{ data: ConfidencialUser }>(`/rj/usuarios/${id}/approve`, {
    method: "POST",
  });
  return res.data;
}

export async function resetConfidencialUserPassword(
  id: string,
): Promise<{ alreadyPending: boolean }> {
  const res = await apiFetch<{ data: { alreadyPending: boolean } }>(
    `/rj/usuarios/${id}/reset-password`,
    { method: "POST" },
  );
  return res.data;
}

export async function fetchRjPermissionsCatalog(): Promise<PermissionGroup[]> {
  const res = await apiFetch<{ data: PermissionGroup[] }>("/rj/permissions/catalog");
  return res.data;
}

export async function fetchRjRoles(): Promise<RoleSummary[]> {
  const res = await apiFetch<{ data: RoleSummary[] }>("/rj/roles");
  return res.data;
}

export async function createRjRole(name: string): Promise<RoleSummary> {
  const res = await apiFetch<{ data: RoleSummary }>("/rj/roles", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function updateRjRoleName(id: string, name: string): Promise<{ id: string; name: string }> {
  const res = await apiFetch<{ data: { id: string; name: string } }>(`/rj/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function deleteRjRole(id: string): Promise<void> {
  await apiFetch(`/rj/roles/${id}`, { method: "DELETE" });
}

export async function updateRjRolePermissions(
  id: string,
  permissionKeys: string[],
): Promise<RoleSummary | undefined> {
  const res = await apiFetch<{ data: RoleSummary }>(`/rj/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionKeys }),
  });
  return res.data;
}

export async function updateConfidencialUserRoles(
  userId: string,
  roleIds: string[],
): Promise<{ id: string; name: string; isSystem: boolean }[]> {
  const res = await apiFetch<{
    data: { id: string; name: string; isSystem: boolean }[];
  }>(`/rj/usuarios/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roleIds }),
  });
  return res.data;
}

