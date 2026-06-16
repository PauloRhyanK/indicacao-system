import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { fetchDailyGoalToday } from "@/lib/cais-api";
import { playSaleSound, unlockSaleSound } from "@/lib/sale-sound";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sale {
  id: string;
  clientName: string;
  sellerName: string;
  value: number;
  soldAt: Date;
  isNew?: boolean;
  boletoPaid?: boolean;
}

const TV_THEME = {
  bg: "#243d4f",
  bgLoading: "#2a4558",
  text: "#ffffff",
  textMuted: "#e2ecf2",
  textSoft: "#b8cad6",
  accent: "#e8c882",
  accentWarm: "#f5e6c8",
  accentMint: "#8fd4b0",
  card: "rgba(255,255,255,0.16)",
  cardBorder: "rgba(255,255,255,0.28)",
  cardSubtle: "rgba(255,255,255,0.09)",
  progressTrack: "rgba(255,255,255,0.2)",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const pct = (val: number, total: number) =>
  Math.min(100, Math.round((val / total) * 100));

const relTime = (date: Date) => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
};

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// ─── Confetti Cannon ─────────────────────────────────────────────────────────

function fireConfetti() {
  const gold = ["#d9bd7e", "#b89c5e", "#e8d4a2", "#f5e6b8"];
  const blue = ["#081421", "#002B49", "#346f93", "#7ba7bc"];

  const shared = { particleCount: 60, spread: 70, colors: [...gold, ...blue] };

  confetti({ ...shared, origin: { x: 0.2, y: 0.5 }, angle: 60 });
  confetti({ ...shared, origin: { x: 0.8, y: 0.5 }, angle: 120 });

  setTimeout(() => {
    confetti({ particleCount: 30, spread: 120, origin: { x: 0.5, y: 0.3 }, colors: gold, scalar: 1.4 });
  }, 250);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: "0.06em", color: TV_THEME.text, lineHeight: 1 }}>
        {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        <span style={{ fontSize: 20, color: TV_THEME.textMuted, marginLeft: 4 }}>
          {time.toLocaleTimeString("pt-BR", { second: "2-digit" }).slice(-2)}
        </span>
      </div>
      <div style={{ fontSize: 13, color: TV_THEME.textMuted, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  paid: number;
  pending?: number;
  total: number;
  animated?: boolean;
}

function segmentPct(amount: number, total: number) {
  if (total <= 0 || amount <= 0) return 0;
  return Math.min(100, (amount / total) * 100);
}

function ProgressBar({ paid, pending = 0, total, animated }: ProgressBarProps) {
  const p = pct(paid, total);
  const paidW = segmentPct(paid, total);
  const pendingW = segmentPct(pending, total);
  const color = p >= 100 ? "#22c55e" : "#d9bd7e";
  const pendingColor = "rgba(255,255,255,0.28)";

  return (
    <div style={{ position: "relative", height: 10, background: TV_THEME.progressTrack, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ display: "flex", height: "100%" }}>
        {paidW > 0 && (
          <div
            style={{
              width: `${paidW}%`,
              background: color,
              borderRadius: pendingW > 0 ? "999px 0 0 999px" : 999,
              transition: animated ? "width 1.2s cubic-bezier(0.22,1,0.36,1)" : "none",
              boxShadow: `0 0 12px ${color}55`,
            }}
          />
        )}
        {pendingW > 0 && (
          <div
            style={{
              width: `${pendingW}%`,
              background: pendingColor,
              borderRadius: paidW > 0 ? "0 999px 999px 0" : 999,
              transition: animated ? "width 1.2s cubic-bezier(0.22,1,0.36,1)" : "none",
            }}
          />
        )}
      </div>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",
        animation: "shimmer 2.5s linear infinite",
        pointerEvents: "none",
      }} />
    </div>
  );
}

interface MetaCardProps {
  label: string;
  sublabel: string;
  value: number;
  pendingValue?: number;
  total: number;
  icon: string;
  accent?: boolean;
}

function MetaCard({ label, sublabel, value, pendingValue = 0, total, icon, accent }: MetaCardProps) {
  const hasTarget = total > 0;
  const p = hasTarget ? pct(value, total) : 0;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div style={{
      background: TV_THEME.card,
      border: accent ? "1px solid rgba(232,200,130,0.55)" : `1px solid ${TV_THEME.cardBorder}`,
      borderRadius: 16,
      padding: "28px 32px",
      flex: 1,
      position: "relative",
      overflow: "hidden",
    }}>
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg,transparent,#d9bd7e,transparent)",
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "1.4px", color: TV_THEME.textMuted, fontWeight: 500, marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 13, color: TV_THEME.textSoft }}>{sublabel}</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>{icon}</div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 42, fontWeight: 600, color: TV_THEME.text, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {fmt(value)}
        </div>
        {hasTarget && (
          <div style={{ fontSize: 16, color: TV_THEME.textSoft }}>/ {fmt(total)}</div>
        )}
      </div>

      {hasTarget ? (
        <>
          <ProgressBar paid={value} pending={pendingValue} total={total} animated={mounted} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{
              fontSize: 13, color: p >= 100 ? "#22c55e" : "#d9bd7e", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: p >= 100 ? "#22c55e" : "#d9bd7e",
                boxShadow: `0 0 8px ${p >= 100 ? "#22c55e" : "#d9bd7e"}`,
              }} />
              {p}% atingido
              {pendingValue > 0 && (
                <span style={{ color: TV_THEME.textSoft, fontWeight: 400 }}>
                  · +{fmt(pendingValue)} pend.
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: TV_THEME.accentWarm }}>
              faltam {fmt(Math.max(0, total - value))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 4, fontSize: 13, color: value > 0 || pendingValue > 0 ? TV_THEME.accent : TV_THEME.textSoft, fontWeight: 500 }}>
          {value > 0 || pendingValue > 0 ? (
            <>
              {value > 0 ? `${fmt(value)} confirmado` : null}
              {value > 0 && pendingValue > 0 ? " · " : null}
              {pendingValue > 0 ? `+${fmt(pendingValue)} pendente` : null}
              {" · sem meta definida"}
            </>
          ) : (
            "sem meta definida · nenhuma venda hoje"
          )}
        </div>
      )}
    </div>
  );
}

interface SaleRowProps {
  sale: Sale;
  isNew?: boolean;
}

interface RankingEntry {
  position: number;
  name: string;
  total: number;
  pendingTotal: number;
  count: number;
  pendingCount: number;
}

function SalesRanking({ entries }: { entries: RankingEntry[] }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: TV_THEME.card,
      border: `1px solid ${TV_THEME.cardBorder}`,
      borderRadius: 16, overflow: "hidden", minHeight: 0,
    }}>
      <div style={{
        padding: "16px 20px 14px",
        borderBottom: `1px solid ${TV_THEME.cardBorder}`,
      }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.4px", color: TV_THEME.accent, fontWeight: 600 }}>
          Ranking da Meta
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {entries.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: TV_THEME.textSoft, fontSize: 13 }}>
            Nenhuma venda no período
          </div>
        ) : (
          entries.map((entry) => (
              <div
                key={`${entry.position}-${entry.name}`}
                style={{
                  padding: "12px 10px",
                  borderRadius: 10,
                  marginBottom: 8,
                  background: entry.position <= 3 ? "rgba(232,200,130,0.12)" : TV_THEME.cardSubtle,
                  border: entry.position <= 3 ? "1px solid rgba(232,200,130,0.28)" : `1px solid ${TV_THEME.cardBorder}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,255,255,0.16)",
                    border: `1px solid ${TV_THEME.cardBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: TV_THEME.accent,
                  }}>
                    {initials(entry.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TV_THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.name}
                    </div>
                    <div style={{ fontSize: 11, color: TV_THEME.textSoft }}>
                      {entry.count} paga{entry.count !== 1 ? "s" : ""}
                      {entry.pendingCount > 0 && (
                        <span style={{ color: "rgba(255,255,255,0.35)" }}>
                          {" "}· {entry.pendingCount} pendente{entry.pendingCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: TV_THEME.accent }}>
                      {fmt(entry.total)}
                    </div>
                    {entry.pendingTotal > 0 && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
                        +{fmt(entry.pendingTotal)} pend.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function SaleRow({ sale, isNew }: SaleRowProps) {
  const paid = sale.boletoPaid !== false;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
      borderRadius: 10,
      background: isNew ? "rgba(217,189,126,0.08)" : "transparent",
      border: isNew ? "1px solid rgba(217,189,126,0.2)" : "1px solid transparent",
      animation: isNew ? "slideIn 0.5s cubic-bezier(0.22,1,0.36,1)" : "none",
      transition: "all 0.3s ease",
      opacity: paid ? 1 : 0.62,
    }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: isNew ? "rgba(217,189,126,0.15)" : paid ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${isNew ? "rgba(217,189,126,0.4)" : paid ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 600,
        color: isNew ? "#d9bd7e" : paid ? TV_THEME.accentWarm : TV_THEME.textSoft,
      }}>
        {initials(sale.clientName)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: paid ? TV_THEME.text : TV_THEME.textSoft, marginBottom: 2 }}>
          {sale.clientName}
          {isNew && (
            <span style={{
              marginLeft: 8, fontSize: 10, background: "rgba(217,189,126,0.15)",
              color: "#d9bd7e", border: "1px solid rgba(217,189,126,0.3)",
              padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em",
              textTransform: "uppercase", fontWeight: 600, verticalAlign: "middle",
            }}>
              nova venda
            </span>
          )}
          {!paid && (
            <span style={{
              marginLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.04em", fontWeight: 500,
            }}>
              pendente
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: TV_THEME.textSoft }}>
          por <span style={{ color: paid ? TV_THEME.accentWarm : "rgba(255,255,255,0.35)" }}>{sale.sellerName}</span>
        </div>
      </div>

      {/* Value */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: isNew ? TV_THEME.accent : paid ? TV_THEME.text : TV_THEME.textSoft, letterSpacing: "-0.01em" }}>
          {fmt(sale.value)}
        </div>
        <div style={{ fontSize: 11, color: TV_THEME.textSoft, marginTop: 2 }}>{relTime(sale.soldAt)}</div>
      </div>
    </div>
  );
}

interface CelebrationOverlayProps {
  sale: Sale;
  onDone: () => void;
}

function CelebrationOverlay({ sale, onDone }: CelebrationOverlayProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    fireConfetti();
    void unlockSaleSound().then(() => playSaleSound());
    const t = setTimeout(() => onDoneRef.current(), 5000);
    return () => clearTimeout(t);
  }, [sale.id]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(8,20,33,0.85)",
      backdropFilter: "blur(8px)",
      animation: "fadeIn 0.3s ease",
    }}>
      {/* Glow ring */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(217,189,126,0.12) 0%,transparent 70%)",
        animation: "pulse 1.5s ease-in-out infinite",
      }} />

      <div style={{
        textAlign: "center", position: "relative", zIndex: 1,
        animation: "scaleIn 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
        <div style={{
          fontSize: 14, textTransform: "uppercase", letterSpacing: "3px",
          color: "#d9bd7e", fontWeight: 500, marginBottom: 16,
        }}>
          Nova Venda de Consórcio
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: "#fcfcfc", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 8 }}>
          {fmt(sale.value)}
        </div>
        <div style={{ fontSize: 22, color: "#7ba7bc", fontWeight: 300, marginBottom: 4 }}>
          {sale.clientName}
        </div>
        <div style={{ fontSize: 15, color: "#5C6B7A" }}>
          vendido por <span style={{ color: "#346f93", fontWeight: 500 }}>{sale.sellerName}</span>
        </div>

        {/* Animated border */}
        <div style={{
          marginTop: 32, height: 2, width: 200, margin: "32px auto 0",
          background: "linear-gradient(90deg,transparent,#d9bd7e,transparent)",
          animation: "expandLine 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both",
        }} />

        <div style={{ marginTop: 16, fontSize: 12, color: "#5C6B7A", letterSpacing: "0.08em" }}>
          fecha em 5 segundos
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function TVDashboard() {
  const [celebration, setCelebration] = useState<Sale | null>(null);
  const [newSaleIds, setNewSaleIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const prevLatestSaleId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daily-goal-today"],
    queryFn: fetchDailyGoalToday,
    refetchInterval: 30_000,
  });

  const sales: Sale[] = useMemo(() => {
    if (!data?.recentSales) return [];
    return data.recentSales.map((s) => ({
      id: s.id,
      clientName: s.leadName,
      sellerName: s.sellerName,
      value: s.saleValue,
      soldAt: new Date(s.soldAt),
      isNew: newSaleIds.has(s.id),
      boletoPaid: s.boletoPaid,
    }));
  }, [data?.recentSales, newSaleIds]);

  useEffect(() => {
    if (!data?.recentSales?.length) return;
    const latest = data.recentSales[0];
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      prevLatestSaleId.current = latest.id;
      return;
    }
    if (latest.id !== prevLatestSaleId.current) {
      prevLatestSaleId.current = latest.id;
      const newSale: Sale = {
        id: latest.id,
        clientName: latest.leadName,
        sellerName: latest.sellerName,
        value: latest.saleValue,
        soldAt: new Date(latest.soldAt),
        isNew: true,
        boletoPaid: latest.boletoPaid,
      };
      setNewSaleIds((prev) => new Set(prev).add(latest.id));
      setCelebration(newSale);
      setTimeout(() => {
        setNewSaleIds((prev) => {
          const next = new Set(prev);
          next.delete(latest.id);
          return next;
        });
      }, 4000);
    }
  }, [data?.recentSales]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onFirstInteraction = () => {
      void unlockSaleSound();
    };
    window.addEventListener("click", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  const dailyTarget = data?.target ?? 0;
  const dailyCurrent = data?.current ?? 0;
  const dailyPending = data?.currentPending ?? 0;
  const periodTarget = data?.periodGoal?.targetAmount ?? 0;
  const periodCurrent = data?.periodGoal?.currentAmount ?? 0;
  const periodPending = data?.periodGoal?.currentPending ?? 0;
  const todayCount = data?.todaySalesCount ?? 0;
  const todayPaidCount = data?.todayPaidSalesCount ?? 0;
  const salesRanking: RankingEntry[] = useMemo(
    () =>
      (data?.salesRanking ?? []).map((r) => ({
        position: r.position,
        name: r.name,
        total: r.total,
        pendingTotal: r.pendingTotal,
        count: r.count,
        pendingCount: r.pendingCount,
      })),
    [data?.salesRanking],
  );

  const ticketMedio = todayPaidCount > 0 ? dailyCurrent / todayPaidCount : 0;
  const maiorVenda = sales.length ? Math.max(...sales.map((s) => s.value)) : 0;
  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const _ = tick;

  if (isLoading && !data) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: TV_THEME.bgLoading, color: TV_THEME.textMuted, fontFamily: "system-ui, sans-serif",
      }}>
        Carregando painel…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: TV_THEME.bgLoading, color: "#f87171", fontFamily: "system-ui, sans-serif",
      }}>
        Não foi possível carregar os dados. Verifique se a API está online.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: ${TV_THEME.bg};
          color: ${TV_THEME.text};
          font-family: 'General Sans', system-ui, sans-serif;
          overflow: hidden;
          height: 100vh;
          width: 100vw;
        }

        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.08); opacity: 0.7; }
        }
        @keyframes expandLine {
          from { width: 0; opacity: 0; }
          to   { width: 200px; opacity: 1; }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>

      {/* Background texture */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(232,200,130,0.12) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Grid noise overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, opacity: 0.015,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='white'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column", padding: "28px 36px", gap: 24 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: "#d9bd7e", color: "#081421",
                fontWeight: 700, fontSize: 13, padding: "4px 8px", borderRadius: 4, letterSpacing: "0.06em",
              }}>
                C
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.12em", color: TV_THEME.text }}>CAIS</span>
              <span style={{ fontSize: 13, color: TV_THEME.textMuted, fontWeight: 300 }}>Consórcios</span>
              <span style={{
                fontSize: 10, background: "rgba(217,189,126,0.12)", color: "#d9bd7e",
                border: "1px solid rgba(217,189,126,0.25)", padding: "3px 10px", borderRadius: 999,
                letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", marginLeft: 4,
              }}>
                Painel ao Vivo
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e", boxShadow: "0 0 8px #22c55e",
                animation: "dotPulse 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 12, color: TV_THEME.textSoft, letterSpacing: "0.04em" }}>
                atualização em tempo real
              </span>
            </div>
          </div>
          <Clock />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(217,189,126,0.3),transparent)" }} />

        {/* ── Meta Cards ── */}
        <div style={{ display: "flex", gap: 20 }}>
          <MetaCard
            label="Meta do Dia"
            sublabel={`${todayCount} venda${todayCount !== 1 ? "s" : ""} hoje`}
            value={dailyCurrent}
            pendingValue={dailyPending}
            total={dailyTarget}
            icon="📅"
          />
          <MetaCard
            label="Meta Geral"
            sublabel="acumulado do período"
            value={periodCurrent}
            pendingValue={periodPending}
            total={periodTarget}
            icon="🎯"
            accent
          />
        </div>

        {/* ── Bottom row: KPIs + Ranking + Feed ── */}
        <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

          {/* Left: KPIs rápidos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 220, flexShrink: 0 }}>
            {[
              { label: "Vendas Hoje",   value: todayCount.toString(),     sub: "conversões" },
              { label: "Ticket Médio",  value: fmt(ticketMedio), sub: "hoje" },
              { label: "Total Vendas",  value: sales.length.toString(),           sub: "recentes" },
              { label: "Maior Venda",   value: fmt(maiorVenda), sub: "recentes" },
            ].map((k) => (
              <div key={k.label} style={{
                background: TV_THEME.card,
                border: `1px solid ${TV_THEME.cardBorder}`,
                borderRadius: 12, padding: "16px 20px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.2px", color: TV_THEME.textSoft, fontWeight: 500 }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, color: TV_THEME.text, letterSpacing: "-0.02em" }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 11, color: TV_THEME.accentWarm }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Ranking + Últimas vendas (50/50) */}
          <div style={{ flex: 1, display: "flex", gap: 20, minHeight: 0, minWidth: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
              <SalesRanking entries={salesRanking} />
            </div>

            <div style={{
              flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0,
              background: TV_THEME.card,
              border: `1px solid ${TV_THEME.cardBorder}`,
              borderRadius: 16, overflow: "hidden",
            }}>
            <div style={{
              padding: "16px 20px 14px",
              borderBottom: `1px solid ${TV_THEME.cardBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.4px", color: "#d9bd7e", fontWeight: 500 }}>
                Últimas Vendas
              </div>
              <div style={{ fontSize: 11, color: TV_THEME.textSoft }}>
                {sales.length} recentes
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
              {sales.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: TV_THEME.textSoft, fontSize: 13 }}>
                  Nenhuma venda registrada ainda
                </div>
              ) : (
                sales.map((sale) => (
                  <SaleRow key={sale.id} sale={sale} isNew={sale.isNew} />
                ))
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Celebration overlay ── */}
      {celebration && (
        <CelebrationOverlay sale={celebration} onDone={dismissCelebration} />
      )}
    </>
  );
}

export const Route = createFileRoute("/tv")({
  head: () => ({
    meta: [{ title: "TV — CAIS Consórcios" }],
  }),
  component: TVDashboard,
});
