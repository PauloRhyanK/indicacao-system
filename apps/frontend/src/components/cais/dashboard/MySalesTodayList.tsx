import { formatBRL, type PersonalDashboardSale } from "@/lib/cais-api";

function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

interface MySalesTodayListProps {
  sales: PersonalDashboardSale[];
}

export function MySalesTodayList({ sales }: MySalesTodayListProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <h3 className="text-[11px] font-medium uppercase tracking-[1px] text-slate-500">
        Minhas vendas de hoje
      </h3>
      {sales.length === 0 ? (
        <p className="mt-4 text-[13px] text-slate-500">Nenhuma venda registrada hoje.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-azul-profundo">{sale.leadName}</p>
                <p className="text-[12px] text-slate-500">
                  {sale.consortiumType ?? "Consórcio"} · {formatBRL(sale.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold tabular-nums text-azul-profundo">
                  {formatBRL(sale.amount)}
                </p>
                <p className="text-[11px] text-slate-500">{relTime(sale.soldAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
