import { useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle, Download } from "lucide-react";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import {
  downloadLeadsImportTemplate,
  importLeadsFromExcel,
  previewImportSheets,
  fetchLookups,
  type ImportPreview,
  type ImportReport,
  type ImportMappings,
  type UnknownValues,
} from "@/lib/cais-api";
import { ImportReportPanel } from "./ImportReportPanel";

type MappingState = Record<string, { mode: "map" | "create"; targetSlug: string; createName: string }>;

function initMappings(unknown: UnknownValues): MappingState {
  const state: MappingState = {};
  for (const val of unknown.statuses) {
    state[val] = { mode: "map", targetSlug: "", createName: val };
  }
  return state;
}

function buildMappingsFromState(
  unknown: UnknownValues,
  state: MappingState,
): ImportMappings {
  const mappings: ImportMappings = { statuses: {} };

  for (const val of unknown.statuses) {
    const s = state[val];
    if (!s) continue;
    mappings.statuses![val] =
      s.mode === "create"
        ? { action: "create", name: s.createName.trim() || val }
        : { action: "map", targetSlug: s.targetSlug };
  }

  return mappings;
}

function allMappingsResolved(unknown: UnknownValues, state: MappingState): boolean {
  const all = unknown.statuses;
  return all.every((val) => {
    const s = state[val];
    if (!s) return false;
    if (s.mode === "create") return s.createName.trim().length > 0;
    return s.targetSlug.length > 0;
  });
}

function MappingRow({
  label,
  value,
  options,
  state,
  onChange,
}: {
  label: string;
  value: string;
  options: { slug: string; name: string }[];
  state: MappingState[string];
  onChange: (next: MappingState[string]) => void;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <p className="mb-2 text-[12px] font-medium text-amber-900">
        {label}: <span className="font-normal">&quot;{value}&quot;</span>
      </p>
      <div className="mb-2 flex gap-3">
        <label className="flex items-center gap-1 text-[12px]">
          <input
            type="radio"
            checked={state.mode === "map"}
            onChange={() => onChange({ ...state, mode: "map" })}
          />
          Mapear para existente
        </label>
        <label className="flex items-center gap-1 text-[12px]">
          <input
            type="radio"
            checked={state.mode === "create"}
            onChange={() => onChange({ ...state, mode: "create" })}
          />
          Criar novo
        </label>
      </div>
      {state.mode === "map" ? (
        <select
          className={inputClass}
          value={state.targetSlug}
          onChange={(e) => onChange({ ...state, targetSlug: e.target.value })}
        >
          <option value="">— Selecione —</option>
          {options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          value={state.createName}
          onChange={(e) => onChange({ ...state, createName: e.target.value })}
          placeholder="Nome do novo registro"
        />
      )}
    </div>
  );
}

export function ImportLeadsForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [mappingState, setMappingState] = useState<MappingState>({});
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });

  const mutation = useMutation({
    mutationFn: () => {
      const mappings = preview?.unknownValues
        ? buildMappingsFromState(preview.unknownValues, mappingState)
        : undefined;
      return importLeadsFromExcel(file!, selectedSheet || undefined, mappings);
    },
    onSuccess: (result) => {
      setReport(result);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["lookups"] });
    },
  });

  async function runPreview(next: File, sheet?: string) {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewImportSheets(next, sheet);
      setPreview(result);
      setMappingState(initMappings(result.unknownValues));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Erro ao analisar planilha");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleFileSelect(next: File | null) {
    setFile(next);
    setPreview(null);
    setSelectedSheet("");
    setPreviewError(null);
    setReport(null);
    setMappingState({});
    mutation.reset();

    if (!next) return;
    setPreviewLoading(true);
    try {
      const result = await previewImportSheets(next);
      setPreview(result);
      setMappingState(initMappings(result.unknownValues));
      setSelectedSheet(result.defaultSheet ?? result.sheets[0]?.name ?? "");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Erro ao analisar planilha");
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (file && selectedSheet) {
      void runPreview(file, selectedSheet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheet]);

  const selectedInfo = preview?.sheets.find((s) => s.name === selectedSheet);
  const unknown = preview?.unknownValues ?? { statuses: [] };
  const hasUnknown = unknown.statuses.length > 0;
  const mappingsOk = !hasUnknown || allMappingsResolved(unknown, mappingState);

  const canImport =
    !!file &&
    !!selectedSheet &&
    selectedInfo?.hasValidHeaders &&
    !previewLoading &&
    !mutation.isPending &&
    mappingsOk;

  if (report) {
    return (
      <div>
        <ImportReportPanel report={report} />
        <div className="mt-4">
          <Button variant="gold" onClick={onDone}>
            Concluir
          </Button>
        </div>
      </div>
    );
  }

  async function handleDownloadTemplate() {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      await downloadLeadsImportTemplate();
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Erro ao baixar modelo");
    } finally {
      setTemplateLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] text-slate-500">
          Baixe o modelo com as colunas Nome, Grau, Telefone e Observações.
        </p>
        <Button
          type="button"
          variant="ghost"
          disabled={templateLoading}
          onClick={() => void handleDownloadTemplate()}
          className="shrink-0"
        >
          <Download className="h-4 w-4" />
          {templateLoading ? "Baixando..." : "Baixar modelo"}
        </Button>
      </div>
      {templateError && (
        <p className="mb-3 text-[12px] text-red-600">{templateError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-[13px] text-slate-600 transition-colors hover:border-ouro hover:bg-ouro/5"
      >
        <Upload className="h-4 w-4" />
        {file ? file.name : "Selecionar arquivo"}
      </button>

      {previewLoading && <p className="mt-3 text-[13px] text-slate-500">Analisando abas...</p>}

      {previewError && <p className="mt-3 text-[13px] text-red-600">{previewError}</p>}

      {preview && preview.sheets.length > 0 && (
        <div className="mt-4">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Aba da planilha
          </label>
          <select
            className={inputClass}
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
          >
            {preview.sheets.map((sheet) => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name}
                {sheet.isDefault ? " (sugerida)" : ""}
                {sheet.hasValidHeaders
                  ? ` — ${sheet.dataRowCount} linhas, ${sheet.matchedColumns} colunas`
                  : " — cabeçalho não reconhecido"}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasUnknown && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Valores desconhecidos — mapeie antes de importar
          </div>
          {unknown.statuses.map((val) => (
            <MappingRow
              key={`status-${val}`}
              label="Status"
              value={val}
              options={lookups.data?.statuses ?? []}
              state={mappingState[val] ?? { mode: "map", targetSlug: "", createName: val }}
              onChange={(next) => setMappingState((s) => ({ ...s, [val]: next }))}
            />
          ))}
        </div>
      )}

      <p className="mt-2 text-[11px] text-slate-500">
        Reimportar atualiza leads existentes pelo código OP-XXXX ou telefone.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={!canImport} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Importando..." : "Importar leads"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {mutation.isError && (
        <p className="mt-3 text-[13px] text-red-600">{(mutation.error as Error).message}</p>
      )}
    </div>
  );
}
