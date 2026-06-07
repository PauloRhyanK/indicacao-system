import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Badge } from "@/components/cais/Badge";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import {
  fetchAllLeads,
  fetchProfiles,
  fetchReferrals,
} from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — CAIS" }] }),
  component: IndicacoesPage,
});

function IndicacoesPage() {
  const leads = useQuery({ queryKey: ["leads-all"], queryFn: fetchAllLeads });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });

  const rows = useMemo(() => {
    const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p.name]));
    const leadMap = new Map((leads.data ?? []).map((l) => [l.id, l]));
    return (referrals.data ?? []).map((r) => {
      const target = leadMap.get(r.lead_id);
      const source =
        r.referrer_type === "user"
          ? { name: profMap.get(r.referrer_user_id ?? "") ?? "—", type: "user" as const }
          : { name: leadMap.get(r.referrer_lead_id ?? "")?.name ?? "—", type: "lead" as const };
      return { id: r.id, source, targetId: target?.id, targetName: target?.name ?? "—" };
    });
  }, [referrals.data, profiles.data, leads.data]);

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
                <SectionHeaderlessTh>Indicado por</SectionHeaderlessTh>
                <SectionHeaderlessTh>Tipo</SectionHeaderlessTh>
                <SectionHeaderlessTh>Lead indicado</SectionHeaderlessTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50">
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium text-azul-profundo">
                    {r.source.name}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    <Badge variant={r.source.type === "user" ? "gray" : "gold"}>
                      {r.source.type === "user" ? "Usuário" : "Lead"}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    {r.targetId ? (
                      <Link
                        to="/leads/$id"
                        params={{ id: r.targetId }}
                        className="text-azul-corporativo hover:text-ouro-escuro"
                      >
                        {r.targetName}
                      </Link>
                    ) : (
                      r.targetName
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

function SectionHeaderlessTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-azul-profundo">
      {children}
    </th>
  );
}
