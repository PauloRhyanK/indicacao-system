import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Spinner } from "./Feedback";
import { inputClass } from "./SlideOver";
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
import { cn } from "@/lib/utils";

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

function payablePendingIds(rewards: CampaignReward[]) {
  return rewards
    .filter((r) => r.status === "PENDING")
    .filter((r) => r.type !== "CLIENT" || r.clientChoice)
    .map((r) => r.id);
}

function rewardLabel(reward: CampaignReward) {
  if (reward.type === "REFERRAL") {
    return `${REWARD_TYPE_LABELS.REFERRAL} — Nível ${reward.referralLevel}`;
  }
  return REWARD_TYPE_LABELS[reward.type as CampaignRewardType];
}

function RewardRow({
  reward,
  canManage,
  onUpdate,
  bulkPending,
}: {
  reward: CampaignReward;
  canManage: boolean;
  onUpdate: () => void;
  bulkPending: boolean;
}) {
  const mutation = useMutation({
    mutationFn: (patch: {
      status?: "PENDING" | "PAID";
      clientChoice?: ClientRewardChoice | null;
    }) => updateCampaignReward(reward.id, patch),
    onSuccess: onUpdate,
  });

  const isClient = reward.type === "CLIENT";
  const pending = bulkPending || mutation.isPending;
  const hasAmount = reward.amount != null;

  return (
    <div
      className={cn(
        "grid items-center gap-2 border-b border-slate-100 py-2.5 last:border-b-0",
        isClient
          ? "grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]"
          : hasAmount
            ? "grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto]"
            : "grid-cols-[minmax(0,1fr)_4.5rem_auto]",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-azul-profundo">{reward.recipientName}</p>
        <p className="truncate text-[11px] text-slate-500">{rewardLabel(reward)}</p>
      </div>
      {!isClient && hasAmount && (
        <span className="text-right text-[12px] tabular-nums text-slate-600">
          {formatBRL(reward.amount!)}
        </span>
      )}
      <div className="flex justify-end">
        <Badge variant={reward.status === "PAID" ? "green" : "amber"} className="text-[10px]">
          {reward.status === "PAID" ? "Pago" : "Pend."}
        </Badge>
      </div>
      <div
        className={cn(
          "flex justify-end gap-2",
          isClient ? "col-start-3 flex-wrap sm:flex-nowrap" : "min-w-[4.5rem]",
        )}
      >
        {canManage && reward.status === "PENDING" && (
          <>
            {isClient && (
              <select
                className={cn(
                  inputClass,
                  "h-9 min-w-[11rem] max-w-full rounded-lg border-slate-200 bg-slate-50 px-3 text-[12px] text-azul-profundo",
                )}
                title="Escolha da recompensa"
                value={reward.clientChoice ?? ""}
                disabled={pending}
                onChange={(e) => {
                  const value = e.target.value as ClientRewardChoice | "";
                  mutation.mutate({ clientChoice: value ? value : null });
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
            <button
              type="button"
              disabled={pending || (isClient && !reward.clientChoice)}
              onClick={() => mutation.mutate({ status: "PAID" })}
              className="shrink-0 self-center rounded-lg px-3 py-1.5 text-[12px] font-medium text-azul-medio hover:bg-slate-100 disabled:opacity-40"
            >
              Pagar
            </button>
          </>
        )}
        {canManage && reward.status === "PAID" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => mutation.mutate({ status: "PENDING" })}
            className="text-[10px] text-slate-500 hover:text-azul-profundo"
          >
            Desfazer
          </button>
        )}
      </div>
      {reward.amountStale && (
        <p
          className={cn(
            "col-span-full text-[10px] text-status-amber",
          )}
        >
          Revisar — valor da venda mudou
        </p>
      )}
    </div>
  );
}

function RewardSection({
  title,
  rewards,
  canManage,
  onUpdate,
  onMarkSectionPaid,
  bulkPending,
  showSectionMarkAll = false,
}: {
  title: string;
  rewards: CampaignReward[];
  canManage: boolean;
  onUpdate: () => void;
  onMarkSectionPaid: (ids: string[]) => void;
  bulkPending: boolean;
  showSectionMarkAll?: boolean;
}) {
  if (rewards.length === 0) return null;

  const sectionPendingIds = payablePendingIds(rewards);

  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {canManage && showSectionMarkAll && sectionPendingIds.length > 0 && (
          <button
            type="button"
            disabled={bulkPending}
            onClick={() => onMarkSectionPaid(sectionPendingIds)}
            className="shrink-0 text-[11px] font-medium text-azul-medio hover:text-azul-profundo disabled:opacity-50"
          >
            Marcar todos como pagos
          </button>
        )}
      </div>
      <div className="rounded-md border border-slate-200 px-3">
        {rewards.map((reward) => (
          <RewardRow
            key={reward.id}
            reward={reward}
            canManage={canManage}
            onUpdate={onUpdate}
            bulkPending={bulkPending}
          />
        ))}
      </div>
    </section>
  );
}

export function CampaignRewardsDialog({
  open,
  onClose,
  purchaseId,
  canManage,
  queue,
}: {
  open: boolean;
  onClose: () => void;
  purchaseId: string | null;
  canManage: boolean;
  queue?: {
    index: number;
    total: number;
    onSkip: () => void;
    onNext: () => void;
    onExit: () => void;
  };
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
  const allPendingIds = summary ? payablePendingIds(summary.rewards) : [];

  function handleUpdated() {
    void qc.invalidateQueries({ queryKey: ["campaign-rewards-list"] });
    void detail.refetch();
  }

  function handleClose() {
    if (queue) {
      queue.onExit();
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-azul-profundo/40 animate-fade-in"
        onClick={queue ? undefined : handleClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-branco shadow-xl",
          summary?.rewardsGenerated ? "max-h-[85vh]" : "",
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="rounded-md bg-ouro/20 p-1.5">
            <Gift className="h-4 w-4 text-azul-profundo" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-azul-profundo">Recompensas da campanha</h2>
            {queue && (
              <p className="text-[11px] font-medium text-ouro">
                {queue.index + 1} de {queue.total}
              </p>
            )}
            {summary && (
              <p className="truncate text-[12px] text-slate-500">
                {summary.leadName} · {formatBRL(summary.purchaseAmount)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label={queue ? "Encerrar conferência em lote" : "Fechar"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {detail.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-7 w-7" />
            </div>
          ) : detail.isError ? (
            <p className="text-[13px] text-status-red">Não foi possível carregar as recompensas.</p>
          ) : !summary?.rewardsGenerated ? (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-500">
                Recompensas ainda não geradas para esta venda.
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
            <div className="space-y-4">
              {summary.staleCount > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                  Valor da venda mudou — revise indicações já pagas.
                </p>
              )}

              <p className="text-[11px] text-slate-500">
                {summary.paidCount}/{summary.totalRewards} pagas
              </p>

              <RewardSection
                title="Equipe comercial"
                rewards={groups!.commercial}
                canManage={canManage}
                onUpdate={handleUpdated}
                onMarkSectionPaid={(ids) => bulkMutation.mutate(ids)}
                bulkPending={bulkMutation.isPending}
                showSectionMarkAll
              />
              <RewardSection
                title="Cadeia de indicação"
                rewards={groups!.referral}
                canManage={canManage}
                onUpdate={handleUpdated}
                onMarkSectionPaid={(ids) => bulkMutation.mutate(ids)}
                bulkPending={bulkMutation.isPending}
                showSectionMarkAll
              />
              <RewardSection
                title="Cliente"
                rewards={groups!.client}
                canManage={canManage}
                onUpdate={handleUpdated}
                onMarkSectionPaid={(ids) => bulkMutation.mutate(ids)}
                bulkPending={bulkMutation.isPending}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          {summary && !queue && (
            <Link
              to="/leads/$id"
              params={{ id: summary.leadId }}
              className="text-[12px] font-medium text-azul-medio hover:text-azul-profundo"
              onClick={handleClose}
            >
              Ficha do lead →
            </Link>
          )}
          {summary && queue && (
            <Link
              to="/leads/$id"
              params={{ id: summary.leadId }}
              className="text-[12px] font-medium text-azul-medio hover:text-azul-profundo"
              onClick={queue.onExit}
            >
              Ficha do lead →
            </Link>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {queue && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[12px]"
                  onClick={queue.onSkip}
                >
                  Pular
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  className="text-[12px]"
                  onClick={queue.onNext}
                >
                  {queue.index + 1 >= queue.total ? "Concluir" : "Próximo"}
                </Button>
              </>
            )}
            {!queue && canManage && allPendingIds.length > 0 && (
              <Button
                type="button"
                variant="gold"
                disabled={bulkMutation.isPending}
                onClick={() => bulkMutation.mutate(allPendingIds)}
                className="text-[12px]"
              >
                {bulkMutation.isPending ? "Salvando..." : "Marcar tudo como pago"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
