import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { StatusBadge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import { NewLeadForm } from "@/components/cais/NewLeadForm";
import { ImportExcelDialog } from "@/components/cais/ImportExcelDialog";
import { RegisterSaleDialog } from "@/components/cais/RegisterSaleDialog";
import { inputClass } from "@/components/cais/SlideOver";
import {
  fetchLeads,
  fetchProfiles,
  fetchReferrals,
  fetchLookups,
  isLeadClosed,
  type Lead,
} from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Leads — CAIS" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const navigate = useNavigate();
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [saleFor, setSaleFor] = useState<Lead | null>(null);

  const referrerLabel = useMemo(() => {
    const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p.name]));
    const leadMap = new Map((leads.data ?? []).map((l) => [l.id, l.name]));
    const map = new Map<string, string>();
    (referrals.data ?? []).forEach((r) => {
      if (r.referrer_type === "user" && r.referrer_user_id)
        map.set(r.lead_id, profMap.get(r.referrer_user_id) ?? "—");
      else if (r.referrer_lead_id)
        map.set(r.lead_id, leadMap.get(r.referrer_lead_id) ?? "—");
    });
    return map;
  }, [referrals.data, profiles.data, leads.data]);

  const filtered = (leads.data ?? []).filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search);
    const matchStatus =
      statusFilter === "all" || l.salesStatus?.slug === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold text-azul-profundo">Leads</h1>
          <p className="text-[14px] text-slate-500">Gerencie e acompanhe suas indicações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(true)}>
            Importar Excel
          </Button>
          <Button variant="gold" onClick={() => setNewOpen(true)}>
            + Novo Lead
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={inputClass + " max-w-xs flex-1"}
          placeholder="Buscar por nome ou celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputClass + " w-auto"}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os status</option>
          {(lookups.data?.statuses ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {leads.isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum lead encontrado"
          message="Ajuste os filtros ou cadastre um novo lead para começar."
          action={
            <Button variant="gold" onClick={() => setNewOpen(true)}>
              + Novo Lead
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-branco">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {["Nome", "Celular", "Indicado por", "Status", "Observações", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-azul-profundo"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() =>
                    navigate({ to: "/leads/$id", params: { id: l.id } })
                  }
                >
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px] font-medium text-azul-profundo">
                    {l.name}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    {l.phone}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    {referrerLabel.get(l.id) ?? "—"}
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2.5 text-[13px]">
                    <StatusBadge
                      status={l.salesStatus?.name ?? "Sem status"}
                      slug={l.salesStatus?.slug}
                    />
                  </td>
                  <td className="max-w-[220px] truncate border-b border-slate-200 px-3 py-2.5 text-[13px] text-slate-500">
                    {l.notes ?? "—"}
                  </td>
                  <td
                    className="relative border-b border-slate-200 px-3 py-2.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      onClick={() => setMenuFor(menuFor === l.id ? null : l.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuFor === l.id && (
                      <div className="absolute right-2 top-10 z-10 w-40 rounded-md border border-slate-200 bg-white py-1 text-left shadow-md">
                        <button
                          className="block w-full px-3 py-2 text-left text-[13px] hover:bg-slate-100"
                          onClick={() => navigate({ to: "/leads/$id", params: { id: l.id } })}
                        >
                          Ver Detalhes
                        </button>
                        {!isLeadClosed(l) && (
                          <button
                            className="block w-full px-3 py-2 text-left text-[13px] text-azul-corporativo hover:bg-slate-100"
                            onClick={() => {
                              setSaleFor(l);
                              setMenuFor(null);
                            }}
                          >
                            Registrar Venda
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewLeadForm open={newOpen} onClose={() => setNewOpen(false)} />
      <ImportExcelDialog open={importOpen} onClose={() => setImportOpen(false)} />
      {saleFor && (
        <RegisterSaleDialog
          open={!!saleFor}
          onClose={() => setSaleFor(null)}
          leadId={saleFor.id}
          leadName={saleFor.name}
        />
      )}
    </AppLayout>
  );
}
