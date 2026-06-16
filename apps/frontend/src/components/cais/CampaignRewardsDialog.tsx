import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Spinner } from "./Feedback";
import {
  bulkMarkCampaignRewardsPaid,
  CLIENT_CHOICE_LABELS,
  fetchPurchaseCampaignRewards,
  formatBRL,
  generatePurchaseCampaignRewards,
  REWARD_TYPE_LABELS,
  updateCampaignReward,
  type CampaignReward,
  type CampaignRewardType,
  type ClientRewardChoice,
  type PurchaseRewardsSummary,
} from "@/lib/cais-api";

function groupRewards(rewards: CampaignReward[]) {
  const commercial = rewards.filter((r) =>
    ["RESPONSAVEL", "CO_VENDEDOR", "FIRST_CONTACT"].includes(r.type),
  );
  const referral = rewards
    .filter((r) => r.type === "REFERRAL")
    .sort((a, b) => a.referralLevel - b.referralLevel);
  const client = rewards.filter((r) => r.type === "CLIENT");
  return { commercial, referral, client };
}

function RewardRow({
  reward,
  canManage,
  onUpdate,
  pending,
}: {
  reward: CampaignReward;
  canManage: boolean;
  onUpdate: () => void;
  pending: boolean;
}) {
  const mutation = useMutation({
    mutationFn: (patch: {
      status?: "PENDING" | "PAID";
      clientChoice?: ClientRewardChoice | null;
    }) => updateCampaignReward(reward.id, patch),
    onSuccess: onUpdate,
  });

  const isClient = reward.type === "CLIENT";
  const label =
    reward.type === "REFERRAL"
      ? `${REWARD_TYPE_LABELS.REFERRAL} — Nível ${reward.referralLevel}`
      : REWARD_TYPE_LABELS[reward.type as CampaignRewardType];

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-azul-profundo">{reward.recipientName}</p>
          <p className="text-[11px] text-slate-500">{label}</p>
          {reward.amount != null && (
            <p className="mt-1 text-[13px] font-semibold text-azul-profundo">
              {formatBRL(reward.amount)}
              {reward.amountStale && (
                <span className="ml-2 text-[11px] font-normal text-status-amber">
                  (revisar — valor da venda mudou)
                </span>
              )}
            </p>
          )}
        </div>
        <Badge variant={reward.status === "PAID" ? "green" : "amber"}>
          {reward.status === "PAID" ? "Pago" : "Pendente"}
        </Badge>
      </div>

      {canManage && reward.status !== "PAID" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          {isClient && (
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px]"
              value={reward.clientChoice ?? ""}
              disabled={pending || mutation.isPending}
              onChange={(e) => {
                const value = e.target.value as ClientRewardChoice | "";
                mutation.mutate({
                  clientChoice: value ? value : null,
                });
              }}
            >
              <option value="">Escolha da recompensa…</option>
              {(Object.entries(CLIENT_CHOICE_LABELS) as [ClientRewardChoice, string][]).map(
                ([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ),
              )}
            </select>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={pending || mutation.isPending || (isClient && !reward.clientChoice)}
            onClick={() => mutation.mutate({ status: "PAID" })}
            className="text-[12px]"
          >
            Marcar como pago
          </Button>
        </div>
      )}

      {canManage && reward.status === "PAID" && (
        <button
          type="button"
          disabled={pending || mutation.isPending}
          onClick={() => mutation.mutate({ status: "PENDING" })}
          className="mt-2 text-[11px] text-slate-500 hover:text-azul-profundo"
        >
          Desfazer pagamento
        </button>
      )}
    </div>
  );
}

function RewardSection({
  title,
  rewards,
  canManage,
  onUpdate,
  pending,
}: {
  title: string;
  rewards: CampaignReward[];
  canManage: boolean;
  onUpdate: () => void;
  pending: boolean;
}) {
  if (rewards.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="space-y-2">
        {rewards.map((reward) => (
          <RewardRow
            key={reward.id}
            reward={reward}
            canManage={canManage}
            onUpdate={onUpdate}
            pending={pending}
          />
        ))}
      </div>
    </div>
  );
}

export function CampaignRewardsDialog({
  open,
  onClose,
  purchaseId,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  purchaseId: string | null;
  canManage: boolean;
}) {
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["campaign-rewards", purchaseId],
    queryFn: () => fetchPurchaseCampaignRewards(purchaseId!),
    enabled: open && !!purchaseId,
  });

  const bulkMutation = useMutation({
    mutationFn: (ids: string[]) => bulkMarkCampaignRewardsPaid(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaign-rewards"] });
      void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
      void detail.refetch();
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePurchaseCampaignRewards(purchaseId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
      void detail.refetch();
    },
  });

  if (!open || !purchaseId) return null;

  const summary: PurchaseRewardsSummary | undefined = detail.data;
  const groups = summary ? groupRewards(summary.rewards) : null;
  const pendingIds =
    summary?.rewards
      .filter((r) => r.status === "PENDING")
      .filter((r) => r.type !== "CLIENT" || r.clientChoice)
      .map((r) => r.id) ?? [];

  function handleUpdated() {
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
    void detail.refetch();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-azul-profundo/40 animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-branco shadow-xl">
        <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-4">
          <div className="rounded-md bg-ouro/20 p-2">
            <Gift className="h-5 w-5 text-azul-profundo" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-azul-profundo">Recompensas da campanha</h2>
            {summary && (
              <p className="mt-0.5 text-[13px] text-slate-500">
                {summary.leadName} · {formatBRL(summary.purchaseAmount)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {detail.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" />
            </div>
          ) : detail.isError ? (
            <p className="text-[13px] text-status-red">Não foi possível carregar as recompensas.</p>
          ) : !summary?.rewardsGenerated ? (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-500">
                Recompensas ainda não geradas para esta venda (comum em vendas importadas antes da
                campanha).
              </p>
              {canManage && (
                <Button
                  type="button"
                  variant="gold"
                  disabled={generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? "Gerando..." : "Gerar recompensas"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {summary.staleCount > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                  O valor da venda mudou após pagamento de indicação. Revise os itens marcados.
                </p>
              )}

              <p className="text-[12px] text-slate-500">
                {summary.paidCount}/{summary.totalRewards} recompensas pagas
              </p>

              <RewardSection
                title="Equipe comercial"
                rewards={groups!.commercial}
                canManage={canManage}
                onUpdate={handleUpdated}
                pending={bulkMutation.isPending}
              />
              <RewardSection
                title="Cadeia de indicação"
                rewards={groups!.referral}
                canManage={canManage}
                onUpdate={handleUpdated}
                pending={bulkMutation.isPending}
              />
              <RewardSection
                title="Cliente"
                rewards={groups!.client}
                canManage={canManage}
                onUpdate={handleUpdated}
                pending={bulkMutation.isPending}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-4">
          {summary && (
            <Link
              to="/leads/$id"
              params={{ id: summary.leadId }}
              className="text-[13px] font-medium text-azul-medio hover:text-azul-profundo"
              onClick={onClose}
            >
              Abrir ficha do lead →
            </Link>
          )}
          {canManage && pendingIds.length > 0 && (
            <Button
              type="button"
              variant="gold"
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate(pendingIds)}
            >
              {bulkMutation.isPending ? "Salvando..." : "Marcar pendentes como pagos"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
