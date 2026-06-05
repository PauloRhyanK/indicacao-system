import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { StatusBadge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { ReferralChain } from "@/components/cais/ReferralChain";
import { RegisterSaleDialog } from "@/components/cais/RegisterSaleDialog";
import {
  fetchLead,
  fetchReferralChain,
  formatDate,
  formatDateTime,
  isLeadClosed,
} from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Detalhe do Lead — CAIS" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = useParams({ from: "/_authenticated/leads/$id" });
  const [saleOpen, setSaleOpen] = useState(false);

  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => fetchLead(id) });
  const chain = useQuery({
    queryKey: ["chain", id],
    queryFn: () => fetchReferralChain(id),
  });

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
        {!isLeadClosed(l) && (
          <Button variant="gold" onClick={() => setSaleOpen(true)}>
            Registrar Venda
          </Button>
        )}
      </div>
      <p className="mb-6 text-[12px] text-slate-500">
        Criado em {formatDate(l.created_at)}
      </p>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Dados do Lead</SectionHeader>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Nome</dt>
            <dd className="text-[14px] text-azul-profundo">{l.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Celular</dt>
            <dd className="text-[14px] text-azul-profundo">{l.phone}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Origem</dt>
            <dd className="text-[14px] text-azul-profundo">{l.source?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Próxima ação</dt>
            <dd className="text-[14px] text-azul-profundo">{l.nextAction?.name ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-[0.5px] text-slate-500">Observações</dt>
            <dd className="text-[14px] text-azul-profundo">{l.notes ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Árvore de Indicações</SectionHeader>
        {chain.isLoading ? (
          <PageLoader />
        ) : (
          <ReferralChain
            chain={chain.data?.chain ?? []}
            currentLeadName={l.name}
            treeTruncated={chain.data?.tree_truncated}
          />
        )}
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
      />
    </AppLayout>
  );
}
