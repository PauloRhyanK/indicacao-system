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

export function formatRjDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRjTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** ISO → campos separados para `<input type="date">` e `<input type="time">`. */
export function splitIsoDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Data + hora locais → ISO UTC. */
export function dateTimePartsToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

/** Próximo horário comercial sugerido ao agendar (hoje ou amanhã 09:00). */
export function defaultReuniaoStartParts(): { date: string; time: string } {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 30) * 30, 0, 0);
  if (rounded.getHours() >= 18) {
    rounded.setDate(rounded.getDate() + 1);
    rounded.setHours(9, 0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${rounded.getFullYear()}-${pad(rounded.getMonth() + 1)}-${pad(rounded.getDate())}`,
    time: `${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`,
  };
}

/** Soma minutos a um horário HH:mm (mesmo dia). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/** ISO → valor para <input type="datetime-local"> em horário local. */
export function isoToDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> (horário local) → ISO em UTC. */
export function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
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
