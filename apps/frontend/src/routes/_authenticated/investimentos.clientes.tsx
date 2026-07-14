import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Search, Upload, Users } from "lucide-react";
import { AppLayout } from "@/components/cais/AppLayout";
import { Button } from "@/components/cais/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvestBtgImportDialog } from "@/components/cais/invest/InvestBtgImportDialog";
import { InvestClienteConvertDialog } from "@/components/cais/invest/InvestClienteConvertDialog";
import { InvestClientesGrid } from "@/components/cais/invest/InvestClientesGrid";
import { fetchProfiles } from "@/lib/cais-api";
import { requireInvestPerm } from "@/lib/invest-guards";
import { usePermissions } from "@/lib/use-permissions";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  fetchInvestClienteAssessores,
  type InvestCliente,
  type InvestClienteStatus,
  type InvestFaixa,
} from "@/lib/invest-api";

export const Route = createFileRoute("/_authenticated/investimentos/clientes")({
  head: () => ({ meta: [{ title: "Clientes BTG · Investimentos — CAIS" }] }),
  beforeLoad: ({ context }) => requireInvestPerm(context, ["investimentos.view"]),
  component: InvestClientesPage,
});

function InvestClientesPage() {
  const { can } = usePermissions();
  const canImport = can("investimentos.import") || can("investimentos.manage");
  const canConvert = can("investimentos.create") || can("investimentos.manage");

  const [importOpen, setImportOpen] = useState(false);
  const [convertCliente, setConvertCliente] = useState<InvestCliente | null>(null);
  const [search, setSearch] = useState("");
  const [assessorFilter, setAssessorFilter] = useState("all");
  const [faixaFilter, setFaixaFilter] = useState<"all" | InvestFaixa>("all");
  const [statusFilter, setStatusFilter] = useState<InvestClienteStatus>("all");

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const assessores = useQuery({
    queryKey: ["invest-cliente-assessores"],
    queryFn: fetchInvestClienteAssessores,
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-azul-profundo">
              <Users className="h-5 w-5 text-ouro-escuro" /> Clientes — Base BTG
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Carteira importada do BTG · transforme clientes em leads para a Fila SDR
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canImport && (
              <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Importar Base BTG
              </Button>
            )}
            <Link
              to="/investimentos"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-branco px-3 py-2.5 text-sm font-medium text-azul-profundo transition-colors hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvestClienteStatus)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="convertido">Convertidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assessorFilter} onValueChange={setAssessorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assessor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os assessores</SelectItem>
              {(assessores.data ?? []).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={faixaFilter} onValueChange={(v) => setFaixaFilter(v as "all" | InvestFaixa)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as faixas</SelectItem>
              {INVEST_FAIXAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {INVEST_FAIXA_INFO[f].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-[220px] pl-8"
              placeholder="Buscar nome, conta, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <InvestClientesGrid
          assessorFilter={assessorFilter}
          faixaFilter={faixaFilter}
          statusFilter={statusFilter}
          search={search}
          canConvert={canConvert}
          onConvert={setConvertCliente}
        />
      </div>

      <InvestBtgImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <InvestClienteConvertDialog
        open={!!convertCliente}
        onClose={() => setConvertCliente(null)}
        cliente={convertCliente}
        profiles={profiles.data ?? []}
      />
    </AppLayout>
  );
}
