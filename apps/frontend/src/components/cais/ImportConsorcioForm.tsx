import { useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import {
  importConsorcioFromExcel,
  previewConsorcioImport,
  fetchProfiles,
  type ConsorcioImportPreview,
  type ImportReport,
  type ImportMappings,
  type ConsorcioUnknownValues,
} from "@/lib/cais-api";
import { previewEmailForName } from "@/lib/user-email";
import { ImportReportPanel } from "./ImportReportPanel";

type UserMappingState = Record<
  string,
  {
    mode: "map" | "create";
    userId: string;
    createName: string;
  }
>;

function initUserMappings(
  unknown: ConsorcioUnknownValues,
  suggestions: ConsorcioImportPreview["suggestedUserMappings"],
): UserMappingState {
  const state: UserMappingState = {};
  for (const val of unknown.users) {
    const suggested = suggestions[val];
    state[val] = {
      mode: suggested ? "map" : "map",
      userId: suggested?.userId ?? "",
      createName: suggested?.userName ?? val,
    };
  }
  return state;
}

function buildUserMappingsFromState(state: UserMappingState): ImportMappings {
  const users: NonNullable<ImportMappings["users"]> = {};
  for (const [val, s] of Object.entries(state)) {
    if (s.mode === "create") {
      users[val] = {
        action: "create",
        name: s.createName.trim() || val,
      };
    } else {
      users[val] = { action: "map", userId: s.userId };
    }
  }
  return { users };
}

function allUserMappingsResolved(unknown: ConsorcioUnknownValues, state: UserMappingState): boolean {
  return unknown.users.every((val) => {
    const s = state[val];
    if (!s) return false;
    if (s.mode === "create") return s.createName.trim().length > 0;
    return s.userId.length > 0;
  });
}

function UserMappingRow({
  value,
  profiles,
  state,
  suggestion,
  onChange,
}: {
  value: string;
  profiles: { id: string; name: string }[];
  state: UserMappingState[string];
  suggestion?: { userId: string; userName: string };
  onChange: (next: UserMappingState[string]) => void;
}) {
  const emailPreview =
    state.mode === "create" && state.createName.trim()
      ? previewEmailForName(state.createName)
      : null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <p className="mb-2 text-[12px] font-medium text-amber-900">
        Vendedor na planilha: <span className="font-normal">&quot;{value}&quot;</span>
        {suggestion && (
          <span className="ml-2 font-normal text-amber-700">
            (sugestão: {suggestion.userName})
          </span>
        )}
      </p>
      <div className="mb-2 flex flex-wrap gap-3">
        <label className="flex items-center gap-1 text-[12px]">
          <input
            type="radio"
            checked={state.mode === "map"}
            onChange={() => onChange({ ...state, mode: "map" })}
          />
          Mapear para usuário
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
          value={state.userId}
          onChange={(e) => onChange({ ...state, userId: e.target.value })}
        >
          <option value="">— Selecione —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          <input
            className={inputClass}
            value={state.createName}
            onChange={(e) => onChange({ ...state, createName: e.target.value })}
            placeholder="Nome oficial"
          />
          {emailPreview && (
            <p className="text-[12px] text-slate-600">
              E-mail gerado: <strong>{emailPreview}</strong>
              <span className="block text-[11px] text-slate-500">
                Se já existir, será acrescentado 2, 3… O usuário define a senha em /primeiro-acesso.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ImportConsorcioForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ConsorcioImportPreview | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [mappingState, setMappingState] = useState<UserMappingState>({});

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const mutation = useMutation({
    mutationFn: () => {
      const mappings = preview?.unknownValues
        ? buildUserMappingsFromState(mappingState)
        : undefined;
      return importConsorcioFromExcel(
        file!,
        purchaseDate,
        selectedSheet || undefined,
        mappings,
      );
    },
    onSuccess: (result) => {
      setReport(result);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
    },
  });

  async function runPreview(next: File, sheet?: string) {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewConsorcioImport(next, sheet);
      setPreview(result);
      setMappingState(initUserMappings(result.unknownValues, result.suggestedUserMappings));
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
      const result = await previewConsorcioImport(next);
      setPreview(result);
      setMappingState(initUserMappings(result.unknownValues, result.suggestedUserMappings));
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
  const unknown = preview?.unknownValues ?? { users: [] };
  const hasUnknown = unknown.users.length > 0;
  const mappingsOk = !hasUnknown || allUserMappingsResolved(unknown, mappingState);

  const canImport =
    !!file &&
    !!selectedSheet &&
    !!purchaseDate &&
    selectedInfo?.hasValidHeaders &&
    (preview?.dataRowCount ?? 0) > 0 &&
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

  return (
    <div>
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

      {previewLoading && (
        <p className="mt-3 text-[13px] text-slate-500">Analisando abas...</p>
      )}

      {previewError && <p className="mt-3 text-[13px] text-red-600">{previewError}</p>}

      <div className="mt-4">
        <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
          Data da campanha (data das vendas)
        </label>
        <input
          type="date"
          className={inputClass}
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </div>

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
                  ? ` — ${sheet.dataRowCount} vendas`
                  : " — sem cabeçalho de campanha"}
              </option>
            ))}
          </select>
          {preview.dataRowCount > 0 && (
            <p className="mt-2 text-[12px] text-slate-500">
              {preview.dataRowCount} venda(s) detectada(s) · {preview.sellerNames.length} nome(s) de
              vendedor na planilha
            </p>
          )}
        </div>
      )}

      {hasUnknown && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Vendedores não reconhecidos — vincule a usuários reais
          </div>
          {unknown.users.map((val) => (
            <UserMappingRow
              key={`user-${val}`}
              value={val}
              profiles={profiles.data ?? []}
              suggestion={preview?.suggestedUserMappings[val]}
              state={
                mappingState[val] ?? {
                  mode: "map",
                  userId: "",
                  createName: val,
                }
              }
              onChange={(next) => setMappingState((s) => ({ ...s, [val]: next }))}
            />
          ))}
        </div>
      )}

      {!hasUnknown && preview && preview.dataRowCount > 0 && (
        <p className="mt-3 text-[12px] text-emerald-700">
          Todos os vendedores foram reconhecidos automaticamente (nome ou alias salvo).
        </p>
      )}

      <p className="mt-2 text-[11px] text-slate-500">
        Cria leads fechados e registra vendas. Novos usuários devem acessar /primeiro-acesso para
        definir senha.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={!canImport} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Importando..." : "Importar vendas"}
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
