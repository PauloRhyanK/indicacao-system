import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Badge } from "@/components/cais/Badge";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { supabase } from "@/integrations/supabase/client";
import { fetchMetaPeriod, fetchProfiles, formatBRL, formatDate } from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — CAIS" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Configurações</h1>
        <p className="text-[14px] text-slate-500">Conta, meta do período e equipe.</p>
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
          <div className="space-y-1 text-[14px] text-azul-profundo">
            <p className="font-medium">{meta.data.period_label}</p>
            <p>Objetivo: {formatBRL(meta.data.target_value)}</p>
            <p className="text-[12px] text-slate-500">
              {formatDate(meta.data.start_date)} — {formatDate(meta.data.end_date)}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">Nenhuma meta configurada.</p>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-branco p-5">
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
    </AppLayout>
  );
}
