import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import { Button } from "@/components/cais/Button";
import {
  fetchInvestClientes,
  formatBRL,
  type InvestCliente,
  type InvestClienteStatus,
  type InvestFaixa,
} from "@/lib/invest-api";
import { cn } from "@/lib/utils";

export function InvestClientesGrid({
  assessorFilter,
  faixaFilter,
  statusFilter,
  search,
  canConvert,
  onConvert,
}: {
  assessorFilter: string;
  faixaFilter: "all" | InvestFaixa;
  statusFilter: InvestClienteStatus;
  search: string;
  canConvert: boolean;
  onConvert: (cliente: InvestCliente) => void;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [assessorFilter, faixaFilter, statusFilter, search]);

  const grid = useQuery({
    queryKey: ["invest-clientes", page, assessorFilter, faixaFilter, statusFilter, search],
    queryFn: () =>
      fetchInvestClientes({
        page,
        limit: 25,
        q: search || undefined,
        assessor: assessorFilter !== "all" ? assessorFilter : undefined,
        faixa: faixaFilter !== "all" ? faixaFilter : undefined,
        status: statusFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const { clientes = [], pagination } = grid.data ?? {
    clientes: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
  };

  if (grid.isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
        Carregando clientes...
      </div>
    );
  }

  if (!clientes.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-branco p-12 text-center text-sm text-slate-500">
        Nenhum cliente encontrado. Importe a Base BTG para começar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-branco">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] table-fixed text-left text-[13px]">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Conta</th>
              <th className="px-4 py-3 font-semibold">Assessor</th>
              <th className="px-4 py-3 font-semibold">PL</th>
              <th className="px-4 py-3 font-semibold">Faixa</th>
              <th className="px-4 py-3 font-semibold">Local</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="truncate font-medium text-azul-profundo" title={c.nome}>
                    {c.nome}
                  </div>
                  {c.email && (
                    <div className="truncate text-[11px] text-slate-500" title={c.email}>
                      {c.email}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{c.conta}</td>
                <td className="truncate px-4 py-3 text-slate-600" title={c.assessor_nome || undefined}>
                  {c.assessor_nome || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ouro-escuro">
                  {c.pl_efetivo > 0 ? formatBRL(c.pl_efetivo) : "—"}
                </td>
                <td className="px-4 py-3">
                  <InvestFaixaTag faixa={c.faixa} />
                </td>
                <td
                  className="truncate px-4 py-3 text-slate-600"
                  title={[c.cidade, c.estado].filter(Boolean).join("/") || undefined}
                >
                  {[c.cidade, c.estado].filter(Boolean).join("/") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      c.convertido
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {c.convertido ? "Convertido" : "Novo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {c.convertido && c.lead_id ? (
                    <Link
                      to="/investimentos/sdr"
                      className="text-[12px] font-medium text-azul-corporativo hover:underline"
                    >
                      Ver na SDR
                    </Link>
                  ) : canConvert ? (
                    <Button
                      variant="ghost"
                      className="ml-auto h-8 gap-1.5 whitespace-nowrap px-3 py-0 text-[12px]"
                      onClick={() => onConvert(c)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Transformar em lead
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[12px] text-slate-500">
        <span>
          {pagination.total} cliente{pagination.total !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
