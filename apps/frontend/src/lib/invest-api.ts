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
  responsavel: { id: string; name: string } | null;
  responsavel_nome: string;
  indicado_por: string;
  celular: string;
  contato: string;
  passo: string;
  retorno: string | null;
  obs: string;
  created_at: string;
  updated_at: string;
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

export interface InvestImportReport {
  total: number;
  created: number;
  updated: number;
  responsaveisNaoMapeados: string[];
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export async function fetchInvestLeads(): Promise<InvestListResult> {
  const res = await apiFetch<{ data: InvestListResult }>("/investimentos/leads");
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

export async function updateInvestConfig(meta: number): Promise<InvestConfig> {
  const res = await apiFetch<{ data: InvestConfig }>("/investimentos/config", {
    method: "PUT",
    body: JSON.stringify({ meta }),
  });
  return res.data;
}

export async function importInvestLeads(rows: InvestImportRow[]): Promise<InvestImportReport> {
  const res = await apiFetch<{ data: InvestImportReport }>("/investimentos/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  return res.data;
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
