import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { StatusBadge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { EditLeadForm } from "@/components/cais/EditLeadForm";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { CommercialRolesList } from "@/components/cais/ReferralChainList";
import { ReferralChainDiagram } from "@/components/cais/ReferralChainDiagram";
import { RegisterSaleDialog } from "@/components/cais/RegisterSaleDialog";
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
  fetchBonusChain,
  fetchLead,
  formatBRL,
  formatDate,
  formatDateTime,
  formatOpportunityGrade,
  isLeadClosed,
} from "@/lib/cais-api";
import { ApiError } from "@/lib/api/client";
import { usePermissions } from "@/lib/use-permissions";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Detalhe do Lead — CAIS" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = useParams({ from: "/_authenticated/leads/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canDelete = can("leads.delete");

  const [saleOpen, setSaleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => fetchLead(id) });
  const referralChain = useQuery({
    queryKey: ["bonus-chain", id],
    queryFn: () => fetchBonusChain(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteOpen(false);
      navigate({ to: "/leads" });
    },
  });

  const openDeleteDialog = () => {
    deleteMutation.reset();
    setDeleteOpen(true);
  };

  if (lead.isLoading) {
    return (
      <AppLayout>
        <PageLoader />
      </AppLayout>
    );
  }

  if (!lead.data) {
    return (
      <AppLayout>
        <p className="text-[14px] text-slate-500">Lead não encontrado.</p>
      </AppLayout>
    );
  }

  const l = lead.data;

  return (
    <AppLayout>
      <Link
        to="/leads"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-azul-medio hover:text-azul-profundo"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Leads
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-semibold text-azul-profundo">{l.name}</h1>
          <StatusBadge
            status={l.salesStatus?.name ?? "Sem status"}
            slug={l.salesStatus?.slug}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLeadClosed(l) && (
            <Button variant="gold" onClick={() => setSaleOpen(true)}>
              Registrar Venda
            </Button>
          )}
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={openDeleteDialog}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>
      <p className="mb-6 text-[12px] text-slate-500">
        Criado em {formatDate(l.created_at)}
        {l.external_code ? ` · ${l.external_code}` : ""}
      </p>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-branco p-5">
          <SectionHeader>Dados do Lead</SectionHeader>
          <dl className="grid grid-cols-1 gap-3">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Nome</dt>
              <dd className="text-[14px] text-azul-profundo">{l.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Celular</dt>
              <dd className="text-[14px] text-azul-profundo">{l.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Oportunidade</dt>
              <dd className="text-[14px] text-azul-profundo">{l.external_code ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">
                Grau de oportunidade
              </dt>
              <dd className="text-[14px] text-azul-profundo">
                {formatOpportunityGrade(l.opportunity_grade)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Valor ofertado</dt>
              <dd className="text-[14px] text-azul-profundo">
                {l.offered_amount != null ? formatBRL(l.offered_amount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Valor fechado</dt>
              <dd className="text-[14px] text-azul-profundo">
                {l.closed_amount != null ? formatBRL(l.closed_amount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Indicado por</dt>
              <dd className="text-[14px] text-azul-profundo">{l.referrer?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Observações</dt>
              <dd className="text-[14px] text-azul-profundo">{l.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-slate-200 bg-branco p-5">
          <SectionHeader>Papéis comerciais</SectionHeader>
          <CommercialRolesList
            responsavel={l.responsavel?.name}
            coVendedor={l.co_vendedor?.name}
            externalCode={l.external_code}
          />
          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Criado por</dt>
              <dd className="text-[14px] text-azul-profundo">{l.created_by?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Primeiro contato</dt>
              <dd className="text-[14px] text-azul-profundo">{l.first_contact?.name ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Cadeia de indicação</SectionHeader>
        <ReferralChainDiagram
          chain={referralChain.data?.chain ?? []}
          currentLead={{ name: l.name, phone: l.phone }}
          treeTruncated={referralChain.data?.tree_truncated}
          loading={referralChain.isLoading}
          error={referralChain.isError}
          onRetry={() => referralChain.refetch()}
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Histórico de Atualizações</SectionHeader>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ouro" />
            <div>
              <p className="text-[13px] text-azul-profundo">Lead criado</p>
              <p className="text-[11px] text-slate-500">{formatDateTime(l.created_at)}</p>
            </div>
          </li>
          {l.updated_at !== l.created_at && (
            <li className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-azul-medio" />
              <div>
                <p className="text-[13px] text-azul-profundo">
                  Status atualizado para {l.salesStatus?.name ?? "—"}
                </p>
                <p className="text-[11px] text-slate-500">{formatDateTime(l.updated_at)}</p>
              </div>
            </li>
          )}
        </ul>
      </div>

      <RegisterSaleDialog
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        leadId={l.id}
        leadName={l.name}
        lead={l}
      />

      <EditLeadForm open={editOpen} onClose={() => setEditOpen(false)} lead={l} />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) deleteMutation.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{l.name}</strong>? O lead será removido da
              listagem. Leads com vendas registradas não podem ser excluídos.
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
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
