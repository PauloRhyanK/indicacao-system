import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Network } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Badge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { CampaignRewardsDialog } from "@/components/cais/CampaignRewardsDialog";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import { PendingRewardsPanel } from "@/components/cais/PendingRewardsPanel";
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
  const qc = useQueryClient();
  const { can } = usePermissions();
  const canManageRewards = can("rewards.manage");

  const [rewardsPurchaseId, setRewardsPurchaseId] = useState<string | null>(null);
  const [rewardQueue, setRewardQueue] = useState<string[] | null>(null);
  const [rewardQueueIndex, setRewardQueueIndex] = useState(0);
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
        includeWithoutRewards: true,
      }),
  });

  const pendingSummary = useQuery({
    queryKey: ["campaign-rewards-pending"],
    queryFn: () =>
      fetchCampaignRewards({
        limit: 100,
        pendingOnly: true,
        includeWithoutRewards: false,
      }),
    enabled: canManageRewards,
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
      await qc.invalidateQueries({ queryKey: ["campaign-rewards-pending"] });
      if (result.remaining > 0 && result.processed > 0) {
        backfillMutation.mutate();
      }
    },
  });

  const startQueueMutation = useMutation({
    mutationFn: () =>
      fetchCampaignRewards({
        limit: 100,
        pendingOnly: true,
        includeWithoutRewards: false,
      }),
    onSuccess: (data) => {
      const ids = data.items.map((item) => item.purchaseId);
      if (ids.length === 0) return;
      setRewardQueue(ids);
      setRewardQueueIndex(0);
      setRewardsPurchaseId(ids[0]!);
    },
  });

  const items = list.data?.items ?? [];
  const backfillRemaining = list.data?.backfillRemaining ?? 0;
  const pendingCount = pendingSummary.data?.pagination.total ?? 0;

  function exitRewardQueue() {
    setRewardQueue(null);
    setRewardQueueIndex(0);
    setRewardsPurchaseId(null);
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-pending"] });
  }

  function advanceRewardQueue() {
    if (!rewardQueue) return;
    const next = rewardQueueIndex + 1;
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-pending"] });
    if (next >= rewardQueue.length) {
      exitRewardQueue();
    } else {
      setRewardQueueIndex(next);
      setRewardsPurchaseId(rewardQueue[next]!);
    }
  }

  function openPurchaseModal(purchaseId: string) {
    setRewardQueue(null);
    setRewardQueueIndex(0);
    setRewardsPurchaseId(purchaseId);
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Indicações</h1>
        <p className="text-[14px] text-slate-500">
          Controle de recompensas da campanha por venda — equipe, indicação e cliente.
        </p>
      </div>

      {canManageRewards && (
        <PendingRewardsPanel
          count={pendingCount}
          disabled={startQueueMutation.isPending || !!rewardQueue}
          onStartQueue={() => startQueueMutation.mutate()}
        />
      )}

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
          title="Nenhuma venda"
          message="As recompensas aparecerão aqui quando houver vendas registradas."
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
                <Th>Indicado por</Th>
                <Th>Recompensas</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.purchaseId}
                  onClick={() => openPurchaseModal(row.purchaseId)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-slate-50",
                    rewardQueue?.[rewardQueueIndex] === row.purchaseId && "bg-ouro/10",
                  )}
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
                      {!row.rewardsGenerated ? (
                        <Badge variant="amber">Não geradas</Badge>
                      ) : (
                        <>
                          <Badge variant={row.pendingCount === 0 ? "green" : "amber"}>
                            {row.paidCount}/{row.totalRewards} pagos
                          </Badge>
                          {row.staleCount > 0 && (
                            <Badge variant="amber">Revisar</Badge>
                          )}
                        </>
                      )}
                    </div>
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
        queue={
          rewardQueue
            ? {
                index: rewardQueueIndex,
                total: rewardQueue.length,
                onSkip: advanceRewardQueue,
                onNext: advanceRewardQueue,
                onExit: exitRewardQueue,
              }
            : undefined
        }
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
