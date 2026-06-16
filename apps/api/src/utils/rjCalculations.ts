import type { RjCredor } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  RJ_CLASSE_VALUES,
  RJ_STATUS_LABELS,
  RJ_STATUS_ORDER,
  RJ_MOTIVO_LABELS,
  type RjClasse,
  type RjStatus,
} from "../constants/rj.js";

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

export interface RjRepresentatividade {
  confPct: number | null;
  pendPct: number | null;
}

function toNumber(val: Prisma.Decimal | number): number {
  return typeof val === "number" ? val : Number(val);
}

export function computeKpis(credores: RjCredor[]): RjKpis {
  let votoTotal = 0;
  let votoConf = 0;
  let votoConfCount = 0;
  let foraTotal = 0;
  let foraCount = 0;
  let confCount = 0;
  let votam = 0;

  for (const c of credores) {
    const valor = toNumber(c.valor);
    if (c.status === "confirmado") confCount++;
    if (c.sujeito) {
      votam++;
      votoTotal += valor;
      if (c.status === "confirmado") {
        votoConf += valor;
        votoConfCount++;
      }
    } else {
      foraCount++;
      foraTotal += valor;
    }
  }

  const count = credores.length;
  return {
    count,
    votam,
    foraCount,
    confCount,
    confPct: count ? Math.round((confCount / count) * 100) : null,
    votoTotal,
    votoConf,
    votoConfCount,
    foraTotal,
  };
}

export function computeClasses(credores: RjCredor[]): RjClasses {
  const agg: RjClasses = {
    I: { valor: 0, count: 0 },
    II: { valor: 0, count: 0 },
    III: { valor: 0, count: 0 },
    IV: { valor: 0, count: 0 },
    fora: { valor: 0, count: 0 },
  };

  for (const c of credores) {
    const valor = toNumber(c.valor);
    if (c.sujeito && c.classe && RJ_CLASSE_VALUES.includes(c.classe as RjClasse)) {
      const key = c.classe as RjClasse;
      agg[key].valor += valor;
      agg[key].count++;
    } else if (!c.sujeito) {
      agg.fora.valor += valor;
      agg.fora.count++;
    }
  }

  return agg;
}

export function computeRepresentatividade(kpis: RjKpis, passivo: number): RjRepresentatividade {
  if (!passivo) return { confPct: null, pendPct: null };
  const confPct = Math.min((kpis.votoConf / passivo) * 100, 100);
  const pendPct = Math.min(((kpis.votoTotal - kpis.votoConf) / passivo) * 100, 100 - confPct);
  return { confPct, pendPct };
}

export function sortCredores(credores: RjCredor[]): RjCredor[] {
  return [...credores].sort((a, b) => {
    const sujDiff = (b.sujeito ? 1 : 0) - (a.sujeito ? 1 : 0);
    if (sujDiff !== 0) return sujDiff;
    const orderA = RJ_STATUS_ORDER[a.status as RjStatus] ?? 99;
    const orderB = RJ_STATUS_ORDER[b.status as RjStatus] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    const valDiff = toNumber(b.valor) - toNumber(a.valor);
    if (valDiff !== 0) return valDiff;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function serializeCredor(c: RjCredor) {
  return {
    id: c.id,
    nome: c.nome,
    sujeito: c.sujeito,
    classe: c.classe,
    motivo: c.motivo,
    valor: toNumber(c.valor),
    status: c.status,
    contato: c.contato,
    passo: c.passo,
    retorno: c.retorno ? c.retorno.toISOString().slice(0, 10) : null,
    obs: c.obs,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export function normalizeCredorFields(input: {
  sujeito: boolean;
  classe?: string | null;
  motivo?: string | null;
}) {
  if (input.sujeito) {
    return { classe: input.classe ?? null, motivo: null };
  }
  return { classe: null, motivo: input.motivo ?? null };
}

export function parseRetorno(retorno?: string | null): Date | null {
  if (!retorno) return null;
  return new Date(`${retorno}T12:00:00.000Z`);
}

export function buildCredoresCsv(credores: RjCredor[]): string {
  const head = [
    "Credor",
    "Situacao",
    "Classe/Motivo",
    "Valor",
    "Status",
    "Contato",
    "Proximo passo",
    "Retorno",
    "Observacoes",
  ];

  const escape = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = credores.map((c) => {
    const cm = c.sujeito
      ? `Classe ${c.classe ?? ""}`
      : (c.motivo ? RJ_MOTIVO_LABELS[c.motivo as keyof typeof RJ_MOTIVO_LABELS] : "") ?? "";
    return [
      c.nome,
      c.sujeito ? "Sujeito a RJ (vota)" : "Fora da RJ (nao vota)",
      cm,
      toNumber(c.valor),
      RJ_STATUS_LABELS[c.status as RjStatus] ?? c.status,
      c.contato,
      c.passo,
      c.retorno ? c.retorno.toISOString().slice(0, 10) : "",
      c.obs,
    ]
      .map(escape)
      .join(",");
  });

  const kpis = computeKpis(credores);
  rows.push("");
  rows.push(
    ["", "VALOR COM VOTO (sujeitos)", "", kpis.votoTotal].map(escape).join(","),
  );
  rows.push(
    ["", "VALOR CONFIRMADO QUE VOTA", "", "", "", kpis.votoConf].map(escape).join(","),
  );
  rows.push(
    ["", "VALOR FORA DA RJ", "", "", "", kpis.foraTotal].map(escape).join(","),
  );

  return [head.map(escape).join(","), ...rows].join("\n");
}
