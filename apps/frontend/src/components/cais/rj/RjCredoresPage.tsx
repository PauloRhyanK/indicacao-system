import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, FileSpreadsheet, FileText, Plus, Printer } from "lucide-react";
import { Button } from "@/components/cais/Button";
import { RjClassesPanel } from "@/components/cais/rj/RjClassesPanel";
import { RjCredorDrawer } from "@/components/cais/rj/RjCredorDrawer";
import { RjCredoresTable } from "@/components/cais/rj/RjCredoresTable";
import { RjFilterBar } from "@/components/cais/rj/RjFilterBar";
import { RjKpiGrid } from "@/components/cais/rj/RjKpiGrid";
import { RjRepresentatividadePanel } from "@/components/cais/rj/RjRepresentatividadePanel";
import {
  createRjCredor,
  deleteRjCredor,
  downloadRjCredoresCsv,
  downloadRjCredoresXlsx,
  fetchRjCredores,
  updateRjConfig,
  updateRjCredor,
  updateRjCredorStatus,
  type RjCredor,
  type RjCredorInput,
  type RjStatus,
} from "@/lib/cais-api";
import { RJ_STATUS_ORDER, type RjFilterKey } from "@/lib/rj-constants";
import { formatRjPlain } from "@/lib/rj-format";
import { usePermissions } from "@/lib/use-permissions";

export function RjCredoresPage() {
  const { can } = usePermissions();
  const canManage = can("rj.manage");
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<RjFilterKey>("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RjCredor | null>(null);
  const [passivoInput, setPassivoInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const passivoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passivoInitialized = useRef(false);

  const query = useQuery({
    queryKey: ["rj-credores"],
    queryFn: fetchRjCredores,
  });

  useEffect(() => {
    if (!query.data || passivoInitialized.current) return;
    setPassivoInput(
      query.data.config.passivo ? formatRjPlain(query.data.config.passivo) : "",
    );
    passivoInitialized.current = true;
  }, [query.data]);

  const configMutation = useMutation({
    mutationFn: updateRjConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
    },
    onError: (e: Error) => setFeedback({ type: "err", msg: e.message }),
  });

  const createMutation = useMutation({
    mutationFn: createRjCredor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setDrawerOpen(false);
      setEditing(null);
      setFeedback({ type: "ok", msg: "Credor cadastrado." });
    },
    onError: (e: Error) => setFeedback({ type: "err", msg: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RjCredorInput> }) =>
      updateRjCredor(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setDrawerOpen(false);
      setEditing(null);
      setFeedback({ type: "ok", msg: "Credor atualizado." });
    },
    onError: (e: Error) => setFeedback({ type: "err", msg: e.message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RjStatus }) =>
      updateRjCredorStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rj-credores"] }),
    onError: (e: Error) => setFeedback({ type: "err", msg: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRjCredor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setFeedback({ type: "ok", msg: "Credor excluído." });
    },
    onError: (e: Error) => setFeedback({ type: "err", msg: e.message }),
  });

  const handlePassivoChange = (value: string) => {
    setPassivoInput(value);
    if (!canManage) return;
    if (passivoDebounce.current) clearTimeout(passivoDebounce.current);
    passivoDebounce.current = setTimeout(() => {
      const passivo = parsePassivo(value);
      configMutation.mutate(passivo);
    }, 600);
  };

  const filteredCredores = useMemo(() => {
    const credores = query.data?.credores ?? [];
    const q = search.toLowerCase().trim();

    let rows = credores.filter((c) => {
      if (filter === "fora") {
        if (c.sujeito) return false;
      } else if (filter !== "all" && c.status !== filter) {
        return false;
      }
      if (
        q &&
        !c.nome.toLowerCase().includes(q) &&
        !(c.passo || "").toLowerCase().includes(q) &&
        !(c.contato || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const sujDiff = (b.sujeito ? 1 : 0) - (a.sujeito ? 1 : 0);
      if (sujDiff !== 0) return sujDiff;
      const orderA = RJ_STATUS_ORDER[a.status] ?? 99;
      const orderB = RJ_STATUS_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      const valDiff = b.valor - a.valor;
      if (valDiff !== 0) return valDiff;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    return rows;
  }, [query.data?.credores, filter, search]);

  const handleExportCsv = async () => {
    try {
      await downloadRjCredoresCsv();
    } catch (e) {
      setFeedback({ type: "err", msg: e instanceof Error ? e.message : "Erro ao exportar CSV" });
    }
  };

  const handleExportExcel = async () => {
    try {
      await downloadRjCredoresXlsx();
    } catch (e) {
      setFeedback({ type: "err", msg: e instanceof Error ? e.message : "Erro ao exportar Excel" });
    }
  };

  const handleDelete = (credor: RjCredor) => {
    if (!window.confirm(`Excluir "${credor.nome}" do condomínio?`)) return;
    deleteMutation.mutate(credor.id);
  };

  const handleSave = async (input: RjCredorInput, id?: string) => {
    if (id) {
      await updateMutation.mutateAsync({ id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
  };

  if (query.isLoading) {
    return <p className="text-[14px] text-slate-500">Carregando credores…</p>;
  }

  if (query.isError) {
    return (
      <p className="text-[14px] text-red-600">
        Não foi possível carregar os credores. Tente novamente.
      </p>
    );
  }

  const { kpis, classes } = query.data!;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Controle Interno · Confidencial
          </div>
          <h1 className="text-[26px] font-semibold text-azul-profundo">
            Condomínio de Credores MG2
          </h1>
          <p className="text-[14px] text-slate-500">
            Coordenação de credores para a Recuperação Judicial · CAIS Investimentos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Button
              variant="ghost"
              className="text-[13px] flex items-center gap-1.5"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            {exportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-64 origin-top-right rounded-md border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-20 animate-fade-in">
                  <button
                    onClick={() => {
                      setExportDropdownOpen(false);
                      void handleExportExcel();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 hover:text-azul-profundo transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-[#107c41] shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Planilha Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">Dados formatados e KPIs</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setExportDropdownOpen(false);
                      void handleExportCsv();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 hover:text-azul-profundo transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Arquivo CSV (.csv)</div>
                      <div className="text-[10px] text-slate-400">Dados puros separados por vírgula</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setExportDropdownOpen(false);
                      window.open("/credores-relatorio", "_blank");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 hover:text-azul-profundo transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-azul-corporativo shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Relatório PDF / Imprimir</div>
                      <div className="text-[10px] text-slate-400">Layout formal para impressão</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          {canManage && (
            <Button
              variant="gold"
              className="text-[13px]"
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Cadastrar
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-[13px] ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{feedback.msg}</span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => setFeedback(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <RjKpiGrid kpis={kpis} />

        <div className="grid gap-4 lg:grid-cols-2">
          <RjRepresentatividadePanel
            kpis={kpis}
            passivoInput={passivoInput}
            onPassivoChange={handlePassivoChange}
            canManage={canManage}
          />
          <RjClassesPanel classes={classes} />
        </div>

        <RjFilterBar
          credores={query.data!.credores}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />

        <RjCredoresTable
          credores={filteredCredores}
          canManage={canManage}
          onEdit={(c) => {
            setEditing(c);
            setDrawerOpen(true);
          }}
          onDelete={handleDelete}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      </div>

      <RjCredorDrawer
        open={drawerOpen}
        credor={editing}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}

function parsePassivo(value: string): number {
  const s = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(s) || 0;
}
