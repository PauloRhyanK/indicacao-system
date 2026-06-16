import { useQuery } from "@tanstack/react-query";
import { Button } from "./Button";
import { fetchBonusChain, formatDate, type Sale } from "@/lib/cais-api";
import { CommercialRolesList, ReferralChainList } from "./ReferralChainList";

export function SaleExpandedPanel({
  sale,
  enabled,
  canDelete,
  onCancel,
}: {
  sale: Sale;
  enabled: boolean;
  canDelete?: boolean;
  onCancel?: () => void;
}) {
  const chain = useQuery({
    queryKey: ["bonus-chain", sale.lead_id],
    queryFn: () => fetchBonusChain(sale.lead_id),
    enabled,
  });

  return (
    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/50 px-4 py-5 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Papéis comerciais da venda
          </h4>
          <CommercialRolesList
            responsavel={sale.commercial.responsavel?.name}
            coVendedor={sale.commercial.co_vendedor?.name}
            consortiumType={sale.consortium_type}
            externalCode={sale.commercial.external_code}
          />
        </div>
        {sale.lead_notes ? (
          <div>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Observações do lead
            </h4>
            <p className="whitespace-pre-wrap text-[13px] text-slate-700">{sale.lead_notes}</p>
          </div>
        ) : null}
        {sale.lead_created_at ? (
          <p className="text-[12px] text-slate-500">
            Lead criado em {formatDate(sale.lead_created_at)}
          </p>
        ) : null}
        {canDelete && onCancel ? (
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onCancel}>
            Desfazer venda
          </Button>
        ) : null}
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
