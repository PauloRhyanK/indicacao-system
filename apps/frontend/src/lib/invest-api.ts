import { apiFetch, getApiBaseUrl, getToken } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Constantes do pipeline (espelham apps/api/src/constants/invest.ts)
// ---------------------------------------------------------------------------

export const INVEST_ETAPAS = [
  "lead",
  "contato",
  "qualificado",
  "reuniao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;

export type InvestEtapa = (typeof INVEST_ETAPAS)[number];

export const INVEST_ETAPAS_ABERTAS: InvestEtapa[] = [
  "lead",
  "contato",
  "qualificado",
  "reuniao",
  "proposta",
  "negociacao",
];

export const INVEST_ETAPA_INFO: Record<
  InvestEtapa,
  { label: string; prob: number; color: string; bg: string }
> = {
  lead: { label: "Novo lead", prob: 5, color: "#8b9aa8", bg: "#eceff2" },
  contato: { label: "Contato feito", prob: 10, color: "#5f93ab", bg: "#eaf2f6" },
  qualificado: { label: "Qualificado", prob: 25, color: "#346f93", bg: "#e7f0f5" },
  reuniao: { label: "Reunião agendada", prob: 40, color: "#a9842b", bg: "#faf2dd" },
  proposta: { label: "Proposta / Diagnóstico", prob: 60, color: "#b0913f", bg: "#f7f0dc" },
  negociacao: { label: "Em negociação", prob: 80, color: "#c67b3a", bg: "#fbeedd" },
  ganho: { label: "Cliente (ganho)", prob: 100, color: "#2f8f5b", bg: "#e6f4ec" },
  perdido: { label: "Perdido", prob: 0, color: "#bd5440", bg: "#fbe9e5" },
};

export const INVEST_ORIGENS = [
  { value: "indicacao", label: "Indicação" },
  { value: "ativa", label: "Prospecção ativa" },
  { value: "btg", label: "Carteira BTG/Necton" },
  { value: "evento", label: "Evento" },
  { value: "digital", label: "Digital / Redes" },
  { value: "parceiro", label: "Parceiro" },
  { value: "outro", label: "Outro" },
] as const;

export const INVEST_PRODUTOS = [
  { value: "carteira", label: "Carteira completa" },
  { value: "rf", label: "Renda Fixa" },
  { value: "fundos", label: "Fundos" },
  { value: "fii", label: "FII" },
  { value: "prev", label: "Previdência" },
  { value: "seguros", label: "Seguros (MAG)" },
  { value: "consorcio", label: "Consórcio" },
  { value: "cambio", label: "Câmbio" },
  { value: "outro", label: "Outro" },
] as const;

// Faixa do cliente — coração do roteamento. Limiares do gestor (KUS-138):
// Digital 100k–5M · Private 5M–30M · Wealth ≥30M. Cores da marca CAIS.
export const INVEST_FAIXAS = ["digital", "private", "wealth"] as const;

export type InvestFaixa = (typeof INVEST_FAIXAS)[number];

export const INVEST_FAIXA_INFO: Record<InvestFaixa, { label: string; color: string; bg: string }> = {
  digital: { label: "Digital", color: "#7ba7bc", bg: "#eaf2f6" },
  private: { label: "Private", color: "#346f93", bg: "#e7f0f5" },
  wealth: { label: "Wealth", color: "#b0913f", bg: "#f7f0dc" },
};

export const INVEST_FAIXA_MIN_PRIVATE = 5_000_000;
export const INVEST_FAIXA_MIN_WEALTH = 30_000_000;

/** Piso de patrimônio para o lead "entrar no PL" da campanha BNF. */
export const INVEST_PL_FLOOR = 1_000_000;

/** Sugere a faixa a partir do PL (sobrescrevível manualmente). */
export function faixaFromPl(pl: number): InvestFaixa {
  if (pl >= INVEST_FAIXA_MIN_WEALTH) return "wealth";
  if (pl >= INVEST_FAIXA_MIN_PRIVATE) return "private";
  return "digital";
}

export function investOrigemLabel(value: string): string {
  return INVEST_ORIGENS.find((o) => o.value === value)?.label ?? value;
}

export function investProdutoLabel(value: string): string {
  return INVEST_PRODUTOS.find((p) => p.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface InvestLead {
  id: string;
  nome: string;
  origem: string;
  produto: string;
  pitch: string;
  pl: number;
  etapa: InvestEtapa;
  probabilidade: number;
  faixa: InvestFaixa | null;
  abaixo_do_piso: boolean;
  responsavel: { id: string; name: string } | null;
  responsavel_nome: string;
  vendedor: { id: string; name: string } | null;
  co_vendedor: { id: string; name: string } | null;
  indicado_por: string;
  celular: string;
  contato: string;
  passo: string;
  retorno: string | null;
  obs: string;
  qualificado_por: { id: string; name: string } | null;
  qualificado_em: string | null;
  created_at: string;
  updated_at: string;
}

/** Lead ainda não qualificado e em etapa inicial → entra na fila de qualificação. */
export function investNeedsQualification(lead: InvestLead): boolean {
  return !lead.qualificado_em && (lead.etapa === "lead" || lead.etapa === "contato");
}

export interface InvestConfig {
  meta: number;
}

export interface InvestListResult {
  leads: InvestLead[];
  config: InvestConfig;
}

export interface InvestLeadPayload {
  nome: string;
  origem: string;
  produto: string;
  pitch: string;
  pl: number;
  etapa: InvestEtapa;
  probabilidade?: number;
  faixa?: InvestFaixa | null;
  responsavelId?: string | null;
  responsavelNome?: string;
  vendedorId?: string | null;
  coVendedorId?: string | null;
  indicadoPor?: string;
  celular?: string;
  contato: string;
  passo: string;
  retorno?: string | null;
  obs: string;
}

export interface InvestImportRow {
  nome: string;
  origem?: string;
  produto?: string;
  pitch?: string;
  pl?: number | string;
  etapa?: string;
  probabilidade?: number | string;
  faixa?: string;
  responsavel?: string;
  indicadoPor?: string;
  celular?: number | string;
  contato?: string;
  passo?: string;
  retorno?: number | string;
  obs?: string;
}

export interface AssessorRef {
  id: string;
  name: string;
}

export interface InvestReuniao {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  titulo: string;
  local: string;
  status: string;
  faixa: InvestFaixa | null;
  lead: { id: string; nome: string; faixa: InvestFaixa | null; pitch: string };
  assessor: { id: string; name: string };
}

export async function fetchOutlookAuthUrl(): Promise<string> {
  const res = await apiFetch<{ url: string }>("/investimentos/outlook/auth");
  return res.url;
}

export interface InvestImportReport {
  total: number;
  created: number;
  updated: number;
  responsaveisNaoMapeados: string[];
  divergencias: { nome: string; detalhe: string }[];
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export async function fetchInvestLeads(): Promise<InvestListResult> {
  const res = await apiFetch<{ data: InvestListResult }>("/investimentos/leads");
  return res.data;
}

export interface InvestGridResult {
  leads: InvestLead[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  aggregate: { pipeTotal: number; pipePonderado: number; count: number };
}

export async function fetchInvestLeadsGrid(params: {
  page?: number;
  limit?: number;
  q?: string;
  responsavel?: string;
  scope?: "all" | "mine" | "unassigned";
  etapa?: InvestEtapa;
}): Promise<InvestGridResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.q) qs.set("q", params.q);
  if (params.responsavel) qs.set("responsavel", params.responsavel);
  if (params.scope && params.scope !== "all") qs.set("scope", params.scope);
  if (params.etapa) qs.set("etapa", params.etapa);
  const res = await apiFetch<{ data: InvestGridResult }>(
    `/investimentos/leads/grid${qs.toString() ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function createInvestLead(payload: InvestLeadPayload): Promise<InvestLead> {
  const res = await apiFetch<{ data: InvestLead }>("/investimentos/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateInvestLead(
  id: string,
  payload: Partial<InvestLeadPayload>,
): Promise<InvestLead> {
  const res = await apiFetch<{ data: InvestLead }>(`/investimentos/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function qualifyInvestLead(
  id: string,
  faixa: InvestFaixa | null,
): Promise<InvestLead> {
  const res = await apiFetch<{ data: InvestLead }>(`/investimentos/leads/${id}/qualificar`, {
    method: "POST",
    body: JSON.stringify({ faixa }),
  });
  return res.data;
}

export async function updateInvestLeadEtapa(id: string, etapa: InvestEtapa): Promise<InvestLead> {
  const res = await apiFetch<{ data: InvestLead }>(`/investimentos/leads/${id}/etapa`, {
    method: "PATCH",
    body: JSON.stringify({ etapa }),
  });
  return res.data;
}

export async function deleteInvestLead(id: string): Promise<void> {
  await apiFetch<void>(`/investimentos/leads/${id}`, { method: "DELETE" });
}

export async function fetchInvestConfig(): Promise<InvestConfig> {
  const res = await apiFetch<{ data: InvestConfig }>("/investimentos/config");
  return res.data;
}

export async function updateInvestConfig(meta: number): Promise<InvestConfig> {
  const res = await apiFetch<{ data: InvestConfig }>("/investimentos/config", {
    method: "PUT",
    body: JSON.stringify({ meta }),
  });
  return res.data;
}

export async function importInvestLeads(
  rows: InvestImportRow[],
  aliases?: { aliasRaw: string; action?: "map" | "create"; userId?: string; createName?: string }[],
): Promise<InvestImportReport> {
  const res = await apiFetch<{ data: InvestImportReport }>("/investimentos/import", {
    method: "POST",
    body: JSON.stringify({ rows, aliases }),
  });
  return res.data;
}

// --- Painel TV BNF (KUS-146) -----------------------------------------------

export interface InvestTvData {
  meta: number;
  captado: number;
  ganhoCount: number;
  pipePonderado: number;
  ranking: { position: number; name: string; total: number; count: number }[];
  recentGanhos: {
    nome: string;
    pl: number;
    responsavel: string;
    faixa: InvestFaixa | null;
    ganhoEm: string;
  }[];
}

export async function fetchInvestTv(): Promise<InvestTvData> {
  const res = await apiFetch<{ data: InvestTvData }>("/investimentos/tv", {}, false);
  return res.data;
}

// --- Agenda de reuniões (KUS-153/149) --------------------------------------

export async function fetchAssessoresParaFaixa(faixa: InvestFaixa | null): Promise<AssessorRef[]> {
  const q = faixa ? `?faixa=${faixa}` : "";
  const res = await apiFetch<{ data: AssessorRef[] }>(`/investimentos/assessores${q}`);
  return res.data;
}

export async function createInvestReuniao(input: {
  leadId: string;
  assessorId: string;
  dataHoraInicio: string;
  dataHoraFim?: string | null;
  titulo?: string;
  local?: string;
  isOnline?: boolean;
}): Promise<InvestReuniao> {
  const res = await apiFetch<{ data: InvestReuniao }>("/investimentos/reunioes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function fetchInvestReunioes(params: {
  scope?: "mine" | "all";
  assessorId?: string;
  leadId?: string;
}): Promise<InvestReuniao[]> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  if (params.assessorId) qs.set("assessorId", params.assessorId);
  if (params.leadId) qs.set("leadId", params.leadId);
  const res = await apiFetch<{ data: InvestReuniao[] }>(
    `/investimentos/reunioes${qs.toString() ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function cancelInvestReuniao(id: string): Promise<void> {
  await apiFetch<void>(`/investimentos/reunioes/${id}`, { method: "DELETE" });
}

export async function fetchAssessorFaixas(): Promise<Record<string, InvestFaixa[]>> {
  const res = await apiFetch<{ data: Record<string, InvestFaixa[]> }>(
    "/investimentos/assessor-faixas",
  );
  return res.data;
}

export async function setAssessorFaixas(
  userId: string,
  faixas: InvestFaixa[],
): Promise<void> {
  await apiFetch(`/investimentos/assessores/${userId}/faixas`, {
    method: "PUT",
    body: JSON.stringify({ faixas }),
  });
}

export async function downloadInvestCsv(): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/investimentos/export/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Falha ao exportar CSV");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pipeline_investimentos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Cálculos do pipe
// ---------------------------------------------------------------------------

/** Previsão ponderada do lead: PL × probabilidade (ganho conta 100%, perdido 0). */
export function investWeighted(lead: InvestLead): number {
  if (lead.etapa === "ganho") return lead.pl;
  if (lead.etapa === "perdido") return 0;
  return (lead.pl * lead.probabilidade) / 100;
}

export function formatBRLCompact(n: number): string {
  if (!n) return "R$ 0";
  if (n >= 1e6)
    return `R$ ${(n / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MM`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function formatBRL(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function formatInvestRetorno(d: string | null): string {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

export function investRetornoSoon(d: string | null): boolean {
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (new Date(`${d}T00:00:00`).getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= 2;
}

// Fila do SDR — recorte do pipeline por "ação necessária hoje" (KUS-148).
export type SdrBucket = "ligar" | "retornos" | "fechar" | "ativas";

export const INVEST_SDR_BUCKETS: { key: SdrBucket; label: string; hint: string; color: string }[] = [
  { key: "ligar", label: "Para ligar hoje", hint: "retorno é hoje", color: "#346f93" },
  { key: "retornos", label: "Retornos pendentes", hint: "retorno vencido / reciclados", color: "#c67b3a" },
  { key: "fechar", label: "Negócios a fechar", hint: "em negociação", color: "#b0913f" },
  { key: "ativas", label: "Oportunidades ativas", hint: "demais leads ativos", color: "#5f93ab" },
];

/** Classifica um lead ATIVO na fila do SDR. Retorna null para ganho/perdido. */
export function investSdrBucket(lead: InvestLead, todayStr: string): SdrBucket | null {
  if (lead.etapa === "ganho" || lead.etapa === "perdido") return null;
  const r = lead.retorno;
  if (r && r === todayStr) return "ligar";
  if (r && r < todayStr) return "retornos";
  if (lead.etapa === "negociacao") return "fechar";
  return "ativas";
}

export interface InvestRespRow {
  nome: string;
  total: number;
  ponderado: number;
  count: number;
}

/** Pipe total e ponderado agrupado por responsável (leads ativos). Ordena por ponderado. */
export function investPipeByResponsavel(leads: InvestLead[]): InvestRespRow[] {
  const map = new Map<string, InvestRespRow>();
  for (const l of leads) {
    if (l.etapa === "ganho" || l.etapa === "perdido") continue;
    const nome = l.responsavel_nome || "Sem responsável";
    const row = map.get(nome) ?? { nome, total: 0, ponderado: 0, count: 0 };
    row.total += l.pl;
    row.ponderado += investWeighted(l);
    row.count += 1;
    map.set(nome, row);
  }
  return [...map.values()].sort((a, b) => b.ponderado - a.ponderado);
}

export interface InvestFaixaDist {
  faixa: InvestFaixa;
  label: string;
  color: string;
  count: number;
  total: number;
  ponderado: number;
}

/** Distribuição do pipe ativo por faixa (Digital/Private/Wealth). */
export function investFaixaDistribution(leads: InvestLead[]): InvestFaixaDist[] {
  const rows = INVEST_FAIXAS.map((f) => ({
    faixa: f,
    label: INVEST_FAIXA_INFO[f].label,
    color: INVEST_FAIXA_INFO[f].color,
    count: 0,
    total: 0,
    ponderado: 0,
  }));
  const by = new Map(rows.map((r) => [r.faixa, r]));
  for (const l of leads) {
    if (l.etapa === "perdido" || l.etapa === "ganho") continue;
    if (!l.faixa) continue;
    const r = by.get(l.faixa);
    if (!r) continue;
    r.count += 1;
    r.total += l.pl;
    r.ponderado += investWeighted(l);
  }
  return rows;
}

export interface InvestFunnelStage {
  etapa: InvestEtapa;
  label: string;
  color: string;
  count: number;
  valor: number;
}

/** Distribuição atual por etapa aberta (para o funil visual). */
export function investFunnelStages(leads: InvestLead[]): InvestFunnelStage[] {
  const rows = INVEST_ETAPAS_ABERTAS.map((e) => ({
    etapa: e,
    label: INVEST_ETAPA_INFO[e].label,
    color: INVEST_ETAPA_INFO[e].color,
    count: 0,
    valor: 0,
  }));
  const idx = new Map(rows.map((r, i) => [r.etapa, i]));
  for (const l of leads) {
    const i = idx.get(l.etapa);
    if (i !== undefined) {
      rows[i].count += 1;
      rows[i].valor += l.pl;
    }
  }
  return rows;
}

/** Taxa de conversão = ganhos / (ganhos + perdidos). */
export function investWinRate(leads: InvestLead[]): {
  ganhos: number;
  perdidos: number;
  taxa: number | null;
} {
  let ganhos = 0;
  let perdidos = 0;
  for (const l of leads) {
    if (l.etapa === "ganho") ganhos += 1;
    else if (l.etapa === "perdido") perdidos += 1;
  }
  const closed = ganhos + perdidos;
  return { ganhos, perdidos, taxa: closed ? (ganhos / closed) * 100 : null };
}

/** Tendência mensal: leads captados (por created_at) e ganhos (por updated_at). */
export function investTrendByMonth(
  leads: InvestLead[],
): { mes: string; captados: number; ganhos: number; captadoValor: number }[] {
  const map = new Map<string, { captados: number; ganhos: number; captadoValor: number }>();
  const get = (k: string) => {
    let r = map.get(k);
    if (!r) {
      r = { captados: 0, ganhos: 0, captadoValor: 0 };
      map.set(k, r);
    }
    return r;
  };
  for (const l of leads) {
    get(l.created_at.slice(0, 7)).captados += 1;
    if (l.etapa === "ganho") {
      const r = get(l.updated_at.slice(0, 7));
      r.ganhos += 1;
      r.captadoValor += l.pl;
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, v]) => ({ mes, ...v }));
}

/** Totais do pipe sobre um conjunto de leads (usado no dashboard e no filtro). */
export function investTotals(leads: InvestLead[]) {
  let plOpen = 0;
  let prevOpen = 0;
  let ganhoVal = 0;
  let ganhoN = 0;
  let perdidoN = 0;
  let ativosN = 0;
  for (const l of leads) {
    if (l.etapa === "ganho") {
      ganhoVal += l.pl;
      ganhoN += 1;
    } else if (l.etapa === "perdido") {
      perdidoN += 1;
    } else {
      ativosN += 1;
      plOpen += l.pl;
      prevOpen += investWeighted(l);
    }
  }
  return { plOpen, prevOpen, ganhoVal, ganhoN, perdidoN, ativosN, prevTotal: ganhoVal + prevOpen };
}

export async function fetchAssessorSlots(assessorId: string, date: string): Promise<string[]> {
  const data = await apiFetch<{ data: string[] }>(`/investimentos/assessores/${assessorId}/slots?date=${date}`);
  return data.data;
}
