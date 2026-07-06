import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchInvestTv } from "@/lib/invest-api";

const T = {
  bg: "#081421",
  text: "#fcfcfc",
  textMuted: "#e2ecf2",
  textSoft: "#7ba7bc",
  gold: "#d9bd7e",
  goldSoft: "#e8d4a2",
  card: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.16)",
  track: "rgba(255,255,255,0.14)",
  green: "#2f8f5b",
} as const;

const FAIXA_COLOR: Record<string, string> = {
  digital: "#7ba7bc",
  private: "#346f93",
  wealth: "#d9bd7e",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtCompact = (n: number) => {
  if (n >= 1e6) return `R$ ${(n / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MM`;
  if (n >= 1e3) return `R$ ${Math.round(n / 1e3)} mil`;
  return fmt(n);
};

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 34, fontWeight: 300, color: T.text, lineHeight: 1 }}>
        {t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {t.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </div>
    </div>
  );
}

function TvBnf() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invest-tv"],
    queryFn: fetchInvestTv,
    refetchInterval: 30_000,
  });

  if (isLoading && !data) {
    return <Center>Carregando painel BNF…</Center>;
  }
  if (isError || !data) {
    return <Center color="#f87171">Não foi possível carregar o painel. Verifique a API.</Center>;
  }

  const pct = data.meta > 0 ? Math.min(100, Math.round((data.captado / data.meta) * 100)) : 0;

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500,600,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; color: ${T.text}; font-family: 'General Sans', system-ui, sans-serif; overflow: hidden; height: 100vh; }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 15% 40%, rgba(123,167,188,0.14), transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(217,189,126,0.14), transparent 50%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column", padding: "22px 30px", gap: 18 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: T.text }}>CAIS</span>
              <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 300 }}>Investimentos</span>
              <span style={{ fontSize: 11, background: "rgba(217,189,126,0.14)", color: T.gold, border: "1px solid rgba(217,189,126,0.3)", padding: "3px 12px", borderRadius: 999, letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>
                BNF · Ao Vivo
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: T.textSoft, letterSpacing: "0.04em" }}>
              Build a New Future · captação em tempo quasi-real
            </div>
          </div>
          <Clock />
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(217,189,126,0.35),transparent)" }} />

        {/* Meta BNF */}
        <div style={{ background: T.card, border: `1px solid rgba(217,189,126,0.4)`, borderRadius: 14, padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "1.4px", color: T.textMuted, fontWeight: 600 }}>
                Meta de captação BNF
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: T.gold, lineHeight: 1 }}>{fmtCompact(data.captado)}</span>
                <span style={{ fontSize: 16, color: T.textSoft }}>/ {fmtCompact(data.meta)}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: T.textSoft }}>{data.ganhoCount} clientes ganhos</div>
              <div style={{ fontSize: 13, color: T.textSoft }}>previsão ponderada {fmtCompact(data.pipePonderado)}</div>
            </div>
          </div>
          <div style={{ position: "relative", height: 10, background: T.track, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? T.green : T.gold, borderRadius: 999, boxShadow: `0 0 14px ${T.gold}66`, transition: "width 1s ease" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)", animation: "shimmer 2.5s linear infinite" }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: pct >= 100 ? T.green : T.gold, fontWeight: 500 }}>
            {pct}% atingido · faltam {fmtCompact(Math.max(0, data.meta - data.captado))}
          </div>
        </div>

        {/* Ranking + recentes */}
        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}`, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.4px", color: T.gold, fontWeight: 600 }}>
              Ranking por responsável · captado
            </div>
            <div style={{ flex: 1, overflow: "hidden", padding: 8 }}>
              {data.ranking.length === 0 ? (
                <Empty>Nenhum cliente ganho ainda</Empty>
              ) : (
                data.ranking.slice(0, 8).map((r) => (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, marginBottom: 6, background: r.position <= 3 ? "rgba(217,189,126,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${r.position <= 3 ? "rgba(217,189,126,0.3)" : T.cardBorder}` }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: r.position <= 3 ? T.gold : T.textSoft, background: r.position <= 3 ? "rgba(217,189,126,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${r.position <= 3 ? "rgba(217,189,126,0.4)" : T.cardBorder}` }}>
                      {r.position}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: T.textSoft }}>{r.count} cliente{r.count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.gold }}>{fmtCompact(r.total)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}`, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.4px", color: T.gold, fontWeight: 600 }}>
              Últimos ganhos
            </div>
            <div style={{ flex: 1, overflow: "hidden", padding: 8 }}>
              {data.recentGanhos.length === 0 ? (
                <Empty>Nenhum ganho registrado</Empty>
              ) : (
                data.recentGanhos.map((g, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, marginBottom: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: g.faixa ? FAIXA_COLOR[g.faixa] : T.green, boxShadow: `0 0 6px ${g.faixa ? FAIXA_COLOR[g.faixa] : T.green}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.nome}</div>
                      <div style={{ fontSize: 11, color: T.textSoft }}>por {g.responsavel || "—"}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.goldSoft }}>{fmtCompact(g.pl)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Center({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: color ?? T.textMuted, fontFamily: "system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 24, textAlign: "center", color: T.textSoft, fontSize: 14 }}>{children}</div>;
}

export const Route = createFileRoute("/tv-investimentos")({
  head: () => ({ meta: [{ title: "TV — CAIS Investimentos (BNF)" }] }),
  component: TvBnf,
});
