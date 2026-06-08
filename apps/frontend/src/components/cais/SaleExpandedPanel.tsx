import { useQuery } from "@tanstack/react-query";
import { fetchBonusChain, type Sale } from "@/lib/cais-api";
import { CommercialRolesList, ReferralChainList } from "./ReferralChainList";

export function SaleExpandedPanel({ sale, enabled }: { sale: Sale; enabled: boolean }) {
  const chain = useQuery({
    queryKey: ["bonus-chain", sale.lead_id],
    queryFn: () => fetchBonusChain(sale.lead_id),
    enabled,
  });

  return (
    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/50 px-4 py-5 md:grid-cols-2">
      <div>
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Papéis comerciais da venda
        </h4>
        <CommercialRolesList
          responsavel={sale.commercial.responsavel?.name}
          vendedor={sale.commercial.vendedor?.name}
          coVendedor={sale.commercial.co_vendedor?.name}
          consortiumType={sale.consortium_type}
          externalCode={sale.commercial.external_code}
        />
      </div>
      <div>
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Cadeia de indicação
        </h4>
        <ReferralChainList
          chain={chain.data?.chain ?? []}
          treeTruncated={chain.data?.tree_truncated}
          loading={chain.isLoading}
          error={chain.isError}
          onRetry={() => chain.refetch()}
        />
      </div>
    </div>
  );
}
