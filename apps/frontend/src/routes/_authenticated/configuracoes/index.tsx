import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Badge } from "@/components/cais/Badge";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { DomainManagerTable } from "@/components/cais/DomainManagerTable";
import { fetchMe } from "@/lib/api/auth";
import { fetchMetaPeriod, fetchProfiles, fetchLookups, formatBRL, formatDate } from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — CAIS" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchMe()
      .then((u) => setEmail(u.email))
      .catch(() => setEmail(""));
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Configurações</h1>
        <p className="text-[14px] text-slate-500">
          Conta, meta do período, equipe e domínios do sistema.
        </p>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Sua Conta</SectionHeader>
        <p className="text-[14px] text-azul-profundo">{email || "—"}</p>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Meta do Período</SectionHeader>
        {meta.isLoading ? (
          <PageLoader />
        ) : meta.data ? (
          <div className="space-y-3 text-[14px] text-azul-profundo">
            <div className="space-y-1">
              <p className="font-medium">{meta.data.period_label}</p>
              <p>Objetivo: {formatBRL(meta.data.target_value)}</p>
              <p className="text-[12px] text-slate-500">
                {formatDate(meta.data.start_date)} — {formatDate(meta.data.end_date)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">Nenhuma meta de período configurada.</p>
        )}
        <Link
          to="/configuracoes/metas"
          className="mt-3 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-azul-medio transition-colors hover:border-azul-medio hover:bg-white hover:text-azul-profundo"
        >
          Gerenciar metas →
        </Link>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Equipe</SectionHeader>
        {profiles.isLoading ? (
          <PageLoader />
        ) : (
          <ul className="divide-y divide-slate-200">
            {(profiles.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <span className="text-[14px] text-azul-profundo">{p.name}</span>
                <Badge variant={p.role === "admin" ? "gold" : "gray"}>{p.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-[18px] font-semibold text-azul-profundo">
            Domínios do Sistema
          </h2>
          <p className="mb-4 text-[13px] text-slate-500">
            Gerencie os valores permitidos para status, origens, próximas ações e tipos de consórcio.
          </p>
        </div>

        {lookups.isLoading ? (
          <PageLoader />
        ) : (
          <>
            <DomainManagerTable
              type="status"
              title="Status de Lead"
              items={lookups.data?.statuses ?? []}
            />
            <DomainManagerTable
              type="source"
              title="Origens"
              items={lookups.data?.sources ?? []}
            />
            <DomainManagerTable
              type="action"
              title="Próximas Ações"
              items={lookups.data?.nextActions ?? []}
            />
            <DomainManagerTable
              type="consortium"
              title="Tipos de Consórcio"
              items={lookups.data?.consortiumTypes ?? []}
            />
          </>
        )}
      </div>
    </>
  );
}
