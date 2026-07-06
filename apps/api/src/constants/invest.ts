// Módulo CAIS Investimentos — pipeline de prospecção (campanha BNF)

export const INVEST_ETAPA_VALUES = [
  "lead",
  "contato",
  "qualificado",
  "reuniao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;

export type InvestEtapa = (typeof INVEST_ETAPA_VALUES)[number];

export const INVEST_ETAPA_LABELS: Record<InvestEtapa, string> = {
  lead: "Novo lead",
  contato: "Contato feito",
  qualificado: "Qualificado",
  reuniao: "Reunião agendada",
  proposta: "Proposta / Diagnóstico",
  negociacao: "Em negociação",
  ganho: "Cliente (ganho)",
  perdido: "Perdido",
};

/** Probabilidade sugerida ao entrar na etapa — usada só como prefill; o valor é manual por lead. */
export const INVEST_ETAPA_DEFAULT_PROB: Record<InvestEtapa, number> = {
  lead: 5,
  contato: 10,
  qualificado: 25,
  reuniao: 40,
  proposta: 60,
  negociacao: 80,
  ganho: 100,
  perdido: 0,
};

// Faixa do cliente — coração do roteamento. Limiares definidos pelo gestor (KUS-138):
// Digital 100k–5M · Private 5M–30M · Wealth ≥30M.
export const INVEST_FAIXA_VALUES = ["digital", "private", "wealth", "pj"] as const;

export type InvestFaixa = (typeof INVEST_FAIXA_VALUES)[number];

export const INVEST_FAIXA_LABELS: Record<InvestFaixa, string> = {
  digital: "Digital",
  private: "Private",
  wealth: "Wealth",
  pj: "PJ",
};

export const INVEST_FAIXA_MIN_PRIVATE = 5_000_000;
export const INVEST_FAIXA_MIN_WEALTH = 30_000_000;

/** Piso de patrimônio para o lead "entrar no PL" da campanha (regra BNF). */
export const INVEST_PL_FLOOR = 1_000_000;

/** Sugere a faixa a partir do PL (sobrescrevível manualmente). */
export function faixaFromPl(pl: number): InvestFaixa {
  if (pl >= INVEST_FAIXA_MIN_WEALTH) return "wealth";
  if (pl >= INVEST_FAIXA_MIN_PRIVATE) return "private";
  return "digital";
}

export const INVEST_ORIGEM_VALUES = [
  "indicacao",
  "ativa",
  "btg",
  "evento",
  "digital",
  "parceiro",
  "outro",
] as const;

export type InvestOrigem = (typeof INVEST_ORIGEM_VALUES)[number];

export const INVEST_ORIGEM_LABELS: Record<InvestOrigem, string> = {
  indicacao: "Indicação",
  ativa: "Prospecção ativa",
  btg: "Carteira BTG/Necton",
  evento: "Evento",
  digital: "Digital / Redes",
  parceiro: "Parceiro",
  outro: "Outro",
};

export const INVEST_PRODUTO_VALUES = [
  "carteira",
  "rf",
  "fundos",
  "fii",
  "prev",
  "seguros",
  "consorcio",
  "cambio",
  "outro",
] as const;

export type InvestProduto = (typeof INVEST_PRODUTO_VALUES)[number];

export const INVEST_PRODUTO_LABELS: Record<InvestProduto, string> = {
  carteira: "Carteira completa",
  rf: "Renda Fixa",
  fundos: "Fundos",
  fii: "FII",
  prev: "Previdência",
  seguros: "Seguros (MAG)",
  consorcio: "Consórcio",
  cambio: "Câmbio",
  outro: "Outro",
};
