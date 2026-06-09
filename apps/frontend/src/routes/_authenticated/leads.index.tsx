import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import { PageLoader, EmptyState } from "@/components/cais/Feedback";
import { NewLeadForm } from "@/components/cais/NewLeadForm";
import { ImportExcelDialog } from "@/components/cais/ImportExcelDialog";
import { RegisterSaleDialog } from "@/components/cais/RegisterSaleDialog";
import { LeadsDataGrid } from "@/components/cais/LeadsDataGrid";
import { LeadsFilterModal } from "@/components/cais/LeadsFilterModal";
import { AssignResponsavelDialog } from "@/components/cais/AssignResponsavelDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inputClass } from "@/components/cais/SlideOver";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteLead,
  fetchLeads,
  fetchProfiles,
  fetchReferrals,
  fetchLookups,
  type Lead,
  type LeadsFilters,
} from "@/lib/cais-api";
import { ApiError } from "@/lib/api/client";
import { usePermissions } from "@/lib/use-permissions";
import {
  countActiveFilters,
  filterRowLabel,
  type FilterRow,
} from "@/lib/leads-filters";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Leads — CAIS" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const { can } = usePermissions();
  const canDelete = can("leads.delete");
  const queryClient = useQueryClient();

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });

  const [quickSearch, setQuickSearch] = useState("");
  const [filters, setFilters] = useState<LeadsFilters>({});
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saleFor, setSaleFor] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [assignTarget, setAssignTarget] = useState<Lead | null>(null);
  const [leadTab, setLeadTab] = useState<"all" | "unassigned">("all");

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    },
  });

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: quickSearch || filters.search,
      page,
      limit: pageSize,
      ...(leadTab === "unassigned" ? { unassigned: true } : {}),
    }),
    [filters, quickSearch, page, pageSize, leadTab],
  );

  const leadsQuery = useQuery({
    queryKey: ["leads", queryFilters],
    queryFn: () => fetchLeads(queryFilters),
  });

  const referrerLabel = useMemo(() => {
    const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p.name]));
    const leadMap = new Map((leadsQuery.data?.leads ?? []).map((l) => [l.id, l.name]));
    const map = new Map<string, string>();
    (referrals.data ?? []).forEach((r) => {
      if (r.referrer_type === "user" && r.referrer_user_id)
        map.set(r.lead_id, profMap.get(r.referrer_user_id) ?? "—");
      else if (r.referrer_lead_id)
        map.set(r.lead_id, leadMap.get(r.referrer_lead_id) ?? "—");
    });
    return map;
  }, [referrals.data, profiles.data, leadsQuery.data?.leads]);

  const activeFilterCount = countActiveFilters(filterRows);
  const activeChips = filterRows.filter((r) => r.field && r.value).map(filterRowLabel);

  const handleApplyFilters = (compiled: LeadsFilters, rows: FilterRow[]) => {
    setFilters(compiled);
    setFilterRows(rows);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newSize: number) => {
    setPage(newPage);
    setPageSize(newSize);
  };

  const leads = leadsQuery.data?.leads ?? [];
  const pagination = leadsQuery.data?.pagination ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

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

      <Tabs
        value={leadTab}
        onValueChange={(v) => {
          setLeadTab(v as "all" | "unassigned");
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">Todos os Leads</TabsTrigger>
          <TabsTrigger value="unassigned">Sem Responsável</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={inputClass + " max-w-xs flex-1"}
          placeholder="Busca rápida (nome, celular, código)..."
          value={quickSearch}
          onChange={(e) => {
            setQuickSearch(e.target.value);
            setPage(1);
          }}
        />
        <Button variant="ghost" onClick={() => setFilterOpen(true)}>
          <Filter className="mr-1.5 h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1.5 rounded-full bg-ouro/20 px-2 py-0.5 text-[11px] font-semibold text-azul-profundo">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] text-azul-profundo"
            >
              {chip}
            </span>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-azul-profundo"
            onClick={() => handleApplyFilters({}, [])}
          >
            <X className="h-3 w-3" /> Limpar filtros
          </button>
        </div>
      )}

      {leadsQuery.isLoading ? (
        <PageLoader />
      ) : leads.length === 0 ? (
        <EmptyState
          title={leadTab === "unassigned" ? "Nenhum lead sem responsável" : "Nenhum lead encontrado"}
          message={
            leadTab === "unassigned"
              ? "Todos os leads da base já possuem um responsável atribuído."
              : "Ajuste os filtros ou cadastre um novo lead para começar."
          }
          action={
            <Button variant="gold" onClick={() => setNewOpen(true)}>
              + Novo Lead
            </Button>
          }
        />
      ) : (
        <LeadsDataGrid
          leads={leads}
          pagination={pagination}
          loading={leadsQuery.isFetching}
          referrerLabel={referrerLabel}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onRegisterSale={setSaleFor}
          canDelete={canDelete}
          onDelete={setDeleteTarget}
          showAssignAction={leadTab === "unassigned"}
          onAssignResponsavel={setAssignTarget}
        />
      )}

      <LeadsFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        lookups={lookups.data}
        profiles={profiles.data}
        initialRows={filterRows}
        onApply={handleApplyFilters}
      />

      <NewLeadForm open={newOpen} onClose={() => setNewOpen(false)} />
      <ImportExcelDialog open={importOpen} onClose={() => setImportOpen(false)} />
      {saleFor && (
        <RegisterSaleDialog
          open={!!saleFor}
          onClose={() => setSaleFor(null)}
          leadId={saleFor.id}
          leadName={saleFor.name}
          lead={saleFor}
        />
      )}

      <AssignResponsavelDialog
        open={!!assignTarget}
        leadId={assignTarget?.id ?? null}
        leadName={assignTarget?.name ?? ""}
        onClose={() => setAssignTarget(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Leads com
              vendas registradas não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <p className="px-6 text-[13px] text-red-600">
              {deleteMutation.error instanceof ApiError
                ? deleteMutation.error.message
                : "Não foi possível excluir o lead."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
