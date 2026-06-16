import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Network } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Badge } from "@/components/cais/Badge";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import { ReferralChainDialog } from "@/components/cais/ReferralChainDialog";
import {
  fetchAllLeads,
  fetchBonusChain,
  fetchProfiles,
  fetchReferrals,
} from "@/lib/cais-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — CAIS" }] }),
  component: IndicacoesPage,
});

function IndicacoesPage() {
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const leads = useQuery({ queryKey: ["leads-all"], queryFn: fetchAllLeads });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });

  const bonusChain = useQuery({
    queryKey: ["bonus-chain", selectedLead?.id],
    queryFn: () => fetchBonusChain(selectedLead!.id),
    enabled: !!selectedLead?.id,
  });

  const rows = useMemo(() => {
    const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p.name]));
    const leadMap = new Map((leads.data ?? []).map((l) => [l.id, l]));
    return (referrals.data ?? []).map((r) => {
      const target = leadMap.get(r.lead_id);
      const source =
        r.referrer_type === "user"
          ? { name: profMap.get(r.referrer_user_id ?? "") ?? "—", type: "user" as const }
          : { name: leadMap.get(r.referrer_lead_id ?? "")?.name ?? "—", type: "lead" as const };
      return {
        id: r.id,
        source,
        targetId: target?.id,
        targetName: target?.name ?? "—",
        targetPhone: target?.phone ?? "",
      };
    });
  }, [referrals.data, profiles.data, leads.data]);

  function openChainModal(
    e: React.MouseEvent,
    lead: { id: string; name: string; phone: string },
  ) {
    e.stopPropagation();
    setSelectedLead(lead);
  }

  function goToLead(targetId: string | undefined) {
    if (!targetId) return;
    void navigate({ to: "/leads/$id", params: { id: targetId } });
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Indicações</h1>
        <p className="text-[14px] text-slate-500">
          Todas as relações de indicação registradas no sistema.
        </p>
      </div>

      {referrals.isLoading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhuma indicação"
          message="As indicações aparecerão aqui conforme novos leads forem cadastrados."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-branco">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <SectionHeaderlessTh className="w-12" />
                <SectionHeaderlessTh>Indicado por</SectionHeaderlessTh>
                <SectionHeaderlessTh>Tipo</SectionHeaderlessTh>
                <SectionHeaderlessTh>Lead indicado</SectionHeaderlessTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => goToLead(r.targetId)}
                  className={cn(
                    "transition-colors",
                    r.targetId && "cursor-pointer hover:bg-slate-50",
                  )}
                >
                  <td className="border-b border-slate-200 px-2 py-2.5 text-center">
                    {r.targetId ? (
                      <button
                        type="button"
                        onClick={(e) =>
                          openChainModal(e, {
                            id: r.targetId!,
                            name: r.targetName,
                            phone: r.targetPhone,
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-azul-medio transition-colors hover:bg-ouro/15 hover:text-azul-profundo"
                        title="Ver cadeia de indicação"
                        aria-label={`Ver cadeia de indicação de ${r.targetName}`}
                      >
                        <Network className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium text-azul-profundo">
                    {r.source.name}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    <Badge variant={r.source.type === "user" ? "gray" : "gold"}>
                      {r.source.type === "user" ? "Usuário" : "Lead"}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium text-azul-profundo">
                    {r.targetName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReferralChainDialog
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        chain={bonusChain.data?.chain ?? []}
        treeTruncated={bonusChain.data?.tree_truncated}
        loading={bonusChain.isLoading}
        error={bonusChain.isError}
        onRetry={() => bonusChain.refetch()}
      />
    </AppLayout>
  );
}

function SectionHeaderlessTh({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-azul-profundo ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
