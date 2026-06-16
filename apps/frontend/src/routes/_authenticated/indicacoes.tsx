import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Gift, Network } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Badge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { CampaignRewardsDialog } from "@/components/cais/CampaignRewardsDialog";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import { ReferralChainDialog } from "@/components/cais/ReferralChainDialog";
import {
  backfillCampaignRewards,
  fetchBonusChain,
  fetchCampaignRewards,
  formatBRL,
  formatDate,
} from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — CAIS" }] }),
  component: IndicacoesPage,
});

function IndicacoesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const canManageRewards = can("rewards.manage");

  const [rewardsPurchaseId, setRewardsPurchaseId] = useState<string | null>(null);
  const [chainLead, setChainLead] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const list = useQuery({
    queryKey: ["campaign-rewards-list"],
    queryFn: () =>
      fetchCampaignRewards({
        limit: 100,
        includeWithoutRewards: false,
      }),
  });

  const bonusChain = useQuery({
    queryKey: ["bonus-chain", chainLead?.id],
    queryFn: () => fetchBonusChain(chainLead!.id),
    enabled: !!chainLead?.id,
  });

  const backfillMutation = useMutation({
    mutationFn: () => backfillCampaignRewards(100),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
      if (result.remaining > 0 && result.processed > 0) {
        backfillMutation.mutate();
      }
    },
  });

  const items = list.data?.items ?? [];
  const backfillRemaining = list.data?.backfillRemaining ?? 0;

  function goToLead(leadId: string) {
    void navigate({ to: "/leads/$id", params: { id: leadId } });
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Indicações</h1>
        <p className="text-[14px] text-slate-500">
          Controle de recompensas da campanha por venda — equipe, indicação e cliente.
        </p>
      </div>

      {canManageRewards && backfillRemaining > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ouro/40 bg-ouro/10 px-4 py-3">
          <p className="text-[13px] text-azul-profundo">
            <span className="font-semibold">{backfillRemaining}</span> venda(s) ainda sem
            recompensas geradas.
          </p>
          <Button
            type="button"
            variant="gold"
            disabled={backfillMutation.isPending}
            onClick={() => backfillMutation.mutate()}
          >
            {backfillMutation.isPending ? "Gerando..." : "Gerar recompensas em lote"}
          </Button>
        </div>
      )}

      {list.isLoading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma recompensa"
          message={
            backfillRemaining > 0
              ? "Gere as recompensas das vendas existentes para começar o controle."
              : "As recompensas aparecerão aqui quando houver vendas registradas."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-branco">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <Th className="w-20" />
                <Th>Lead</Th>
                <Th>Valor</Th>
                <Th>Data</Th>
                <Th>Indicador</Th>
                <Th>Recompensas</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.purchaseId}
                  onClick={() => goToLead(row.leadId)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="border-b border-slate-200 px-2 py-2.5">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        title="Ver cadeia"
                        aria-label={`Ver cadeia de ${row.leadName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-azul-medio hover:bg-ouro/15 hover:text-azul-profundo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChainLead({
                            id: row.leadId,
                            name: row.leadName,
                            phone: row.leadPhone ?? "",
                          });
                        }}
                      >
                        <Network className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium text-azul-profundo">
                    {row.leadName}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] text-azul-profundo">
                    {formatBRL(row.purchaseAmount)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] text-slate-600">
                    {formatDate(row.purchaseDate)}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] text-slate-600">
                    {row.directReferrerName ?? "—"}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={row.pendingCount === 0 ? "green" : "amber"}>
                        {row.paidCount}/{row.totalRewards} pagos
                      </Badge>
                      {row.staleCount > 0 && (
                        <Badge variant="amber">Revisar</Badge>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-slate-200 px-2 py-2.5">
                    <button
                      type="button"
                      title="Gerenciar recompensas"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-azul-medio hover:bg-ouro/15 hover:text-azul-profundo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRewardsPurchaseId(row.purchaseId);
                      }}
                    >
                      <Gift className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CampaignRewardsDialog
        open={!!rewardsPurchaseId}
        onClose={() => setRewardsPurchaseId(null)}
        purchaseId={rewardsPurchaseId}
        canManage={canManageRewards}
      />

      <ReferralChainDialog
        open={!!chainLead}
        onClose={() => setChainLead(null)}
        lead={chainLead}
        chain={bonusChain.data?.chain ?? []}
        treeTruncated={bonusChain.data?.tree_truncated}
        loading={bonusChain.isLoading}
        error={bonusChain.isError}
        onRetry={() => bonusChain.refetch()}
      />
    </AppLayout>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-azul-profundo",
        className,
      )}
    >
      {children}
    </th>
  );
}
