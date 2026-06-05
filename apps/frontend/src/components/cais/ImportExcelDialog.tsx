import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import {
  importLeadsFromExcel,
  previewImportSheets,
  type ImportPreview,
  type ImportReport,
} from "@/lib/cais-api";

export function ImportExcelDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const mutation = useMutation({
    mutationFn: () => importLeadsFromExcel(file!, selectedSheet || undefined),
    onSuccess: (result) => {
      setReport(result);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
    },
  });

  async function handleFileSelect(next: File | null) {
    setFile(next);
    setPreview(null);
    setSelectedSheet("");
    setPreviewError(null);
    setReport(null);
    mutation.reset();

    if (!next) return;

    setPreviewLoading(true);
    try {
      const result = await previewImportSheets(next);
      setPreview(result);
      setSelectedSheet(result.defaultSheet ?? result.sheets[0]?.name ?? "");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Erro ao analisar planilha");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPreview(null);
    setSelectedSheet("");
    setPreviewError(null);
    setReport(null);
    mutation.reset();
    onClose();
  }

  const selectedInfo = preview?.sheets.find((s) => s.name === selectedSheet);
  const canImport =
    !!file &&
    !!selectedSheet &&
    selectedInfo?.hasValidHeaders &&
    !previewLoading &&
    !mutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-azul-profundo/40 animate-fade-in" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-branco p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-ouro/20 p-2">
            <FileSpreadsheet className="h-5 w-5 text-azul-profundo" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-azul-profundo">Importar Excel</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Selecione o arquivo e a aba com colunas BASE_CRM (ID, Nome do cliente, etc.).
            </p>
          </div>
        </div>

        {!report ? (
          <div className="mt-5">
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

            {previewError && (
              <p className="mt-3 text-[13px] text-red-600">{previewError}</p>
            )}

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
                        : " — sem cabeçalho BASE_CRM"}
                    </option>
                  ))}
                </select>
                {selectedInfo && !selectedInfo.hasValidHeaders && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Esta aba não contém as colunas esperadas (ID + Nome do cliente). Escolha outra
                    aba ou use a sugerida automaticamente.
                  </p>
                )}
                {selectedInfo?.hasValidHeaders && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Detecção automática: prioriza aba <strong>BASE_CRM</strong> ou a que tiver mais
                    colunas reconhecidas.
                  </p>
                )}
              </div>
            )}

            <p className="mt-2 text-[11px] text-slate-500">
              Reimportar atualiza leads existentes pelo código OP-XXXX.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="gold"
                disabled={!canImport}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Importando..." : "Importar"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
            {mutation.isError && (
              <p className="mt-3 text-[13px] text-red-600">
                {(mutation.error as Error).message}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            {report.sheetUsed && (
              <p className="mb-3 text-[12px] text-slate-500">
                Aba importada: <strong>{report.sheetUsed}</strong>
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-green-50 px-2 py-3">
                <p className="text-[20px] font-semibold text-green-700">{report.imported}</p>
                <p className="text-[11px] text-green-800">Novos</p>
              </div>
              <div className="rounded-md bg-blue-50 px-2 py-3">
                <p className="text-[20px] font-semibold text-blue-700">{report.updated}</p>
                <p className="text-[11px] text-blue-800">Atualizados</p>
              </div>
              <div className="rounded-md bg-amber-50 px-2 py-3">
                <p className="text-[20px] font-semibold text-amber-700">{report.skipped}</p>
                <p className="text-[11px] text-amber-800">Ignorados</p>
              </div>
            </div>
            {report.errors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[12px] font-medium text-slate-700">Avisos</p>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  {report.errors.map((e) => (
                    <li key={`${e.row}-${e.message}`}>
                      Linha {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <Button variant="gold" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
