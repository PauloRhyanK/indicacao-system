import { formatBRL } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

export interface SalesRankingEntry {
  position: number;
  name: string;
  total: number;
  pendingTotal?: number;
  count: number;
  pendingCount?: number;
}

export interface RecentSaleEntry {
  id: string;
  leadName: string;
  sellerName: string;
  saleValue: number;
  soldAt: string;
  boletoPaid?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

export function SalesRankingPanel({
  title,
  entries,
  className,
}: {
  title: string;
  entries: SalesRankingEntry[];
  className?: string;
}) {
  const isParticipation = title.toLowerCase().includes("participa");

  return (
    <div
      className={cn(
        "flex min-h-[360px] flex-col overflow-hidden rounded-md border border-slate-200 bg-branco",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-ouro-escuro">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] text-slate-500">
            Nenhuma venda no período
          </p>
        ) : (
          entries.map((entry) => {
            const pendingTotal = entry.pendingTotal ?? 0;
            const pendingCount = entry.pendingCount ?? 0;
            const highlighted = entry.position <= 3;
            return (
              <div
                key={`${entry.position}-${entry.name}`}
                className={cn(
                  "mb-2 rounded-lg border p-3 last:mb-0",
                  highlighted
                    ? "border-ouro/30 bg-ouro/5"
                    : "border-slate-200 bg-slate-50/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-bold text-azul-profundo">
                    {initials(entry.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-azul-profundo">
                      {entry.name}
                    </p>
                    {!isParticipation && (
                      <p className="text-[11px] text-slate-500">
                        {entry.count} paga{entry.count !== 1 ? "s" : ""}
                        {pendingTotal > 0 && (
                          <span className="text-slate-400">
                            {" "}
                            · {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold tabular-nums text-azul-profundo">
                      {isParticipation ? `${entry.count} ${entry.count === 1 ? "venda" : "vendas"}` : formatBRL(entry.total)}
                    </p>
                    {isParticipation ? (
                      pendingCount > 0 && (
                        <p className="text-[11px] tabular-nums text-slate-400">
                          +{pendingCount} pend.
                        </p>
                      )
                    ) : (
                      pendingTotal > 0 && (
                        <p className="text-[11px] tabular-nums text-slate-400">
                          +{formatBRL(pendingTotal)} pend.
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RecentSalesPanel({
  sales,
  className,
}: {
  sales: RecentSaleEntry[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[360px] flex-col overflow-hidden rounded-md border border-slate-200 bg-branco",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-ouro-escuro">
          Últimas Vendas
        </h3>
        <span className="text-[11px] text-slate-500">{sales.length} recentes</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sales.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] text-slate-500">
            Nenhuma venda registrada ainda
          </p>
        ) : (
          sales.map((sale) => {
            const paid = sale.boletoPaid !== false;
            return (
            <div
              key={sale.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-slate-50",
                !paid && "opacity-70",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
                  paid
                    ? "border-slate-200 bg-slate-50 text-azul-medio"
                    : "border-slate-200/80 bg-slate-100 text-slate-400",
                )}
              >
                {initials(sale.leadName)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[14px] font-medium",
                    paid ? "text-azul-profundo" : "text-slate-500",
                  )}
                >
                  {sale.leadName}
                </p>
                <p className="text-[12px] text-slate-500">
                  por <span className={paid ? "text-azul-medio" : "text-slate-400"}>{sale.sellerName}</span>
                  {!paid && <span className="text-slate-400"> · boleto pendente</span>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "text-[15px] font-semibold tabular-nums",
                    paid ? "text-azul-profundo" : "text-slate-400",
                  )}
                >
                  {formatBRL(sale.saleValue)}
                </p>
                <p className="text-[11px] text-slate-500">{relTime(sale.soldAt)}</p>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
