export function parseRjNum(value: string | number | undefined | null): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const s = String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(s) || 0;
}

export function formatRjCurrency(n: number): string {
  if (!n) return "R$ 0";
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function formatRjCompact(n: number): string {
  if (!n) return "R$ 0";
  if (n >= 1e6) {
    return `R$ ${(n / 1e6).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} MM`;
  }
  if (n >= 1e3) {
    return `R$ ${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return formatRjCurrency(n);
}

export function formatRjPlain(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function formatRjDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return "—";
  return `${p[2]}/${p[1]}`;
}

export function isRjRetornoSoon(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dt = new Date(`${iso}T00:00:00`);
  const diff = (dt.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= 2;
}

export function computeRepresentatividade(
  votoConf: number,
  votoTotal: number,
  passivo: number,
): { confPct: number | null; pendPct: number | null } {
  if (!passivo) return { confPct: null, pendPct: null };
  const confPct = Math.min((votoConf / passivo) * 100, 100);
  const pendPct = Math.min(((votoTotal - votoConf) / passivo) * 100, 100 - confPct);
  return { confPct, pendPct };
}
