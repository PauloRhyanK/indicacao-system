import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/cais/Button";
import {
  importInvestLeads,
  type InvestImportReport,
  type InvestImportRow,
} from "@/lib/invest-api";

interface InvestImportDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Mapeia os cabeçalhos da planilha BASE (Lead, Origem, Produto, Pitch, PL,
 * Etapa, Probabilidade, Responsavel, Contato, Proximo passo, Retorno,
 * Observacoes) para as chaves da API. O cabeçalho pode estar em qualquer
 * linha — procuramos a linha que contém "Lead".
 */
const HEADER_MAP: Record<string, keyof InvestImportRow> = {
  lead: "nome",
  nome: "nome",
  origem: "origem",
  produto: "produto",
  pitch: "pitch",
  pl: "pl",
  patrimonio: "pl",
  etapa: "etapa",
  probabilidade: "probabilidade",
  faixa: "faixa",
  responsavel: "responsavel",
  "indicado por": "indicadoPor",
  indicado: "indicadoPor",
  celular: "celular",
  contato: "contato",
  "proximo passo": "passo",
  passo: "passo",
  retorno: "retorno",
  observacoes: "obs",
  obs: "obs",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseSheet(data: ArrayBuffer): InvestImportRow[] {
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  let headerIdx = -1;
  let colMap: Partial<Record<number, keyof InvestImportRow>> = {};
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const cells = grid[i].map(normalizeHeader);
    if (cells.includes("lead") || cells.includes("nome")) {
      headerIdx = i;
      cells.forEach((cell, col) => {
        const key = HEADER_MAP[cell];
        if (key && !Object.values(colMap).includes(key)) colMap[col] = key;
      });
      break;
    }
  }
  if (headerIdx < 0) return [];

  const rows: InvestImportRow[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row: Partial<InvestImportRow> = {};
    for (const [colStr, key] of Object.entries(colMap)) {
      const value = grid[i][Number(colStr)];
      if (key === undefined || value === "" || value === undefined || value === null) continue;
      if (key === "pl" || key === "probabilidade" || key === "retorno" || key === "celular") {
        (row as Record<string, unknown>)[key] = typeof value === "number" ? value : String(value);
      } else {
        (row as Record<string, unknown>)[key] = String(value);
      }
    }
    if (row.nome && String(row.nome).trim()) rows.push(row as InvestImportRow);
  }
  return rows;
}

export function InvestImportDialog({ open, onClose }: InvestImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<InvestImportRow[]>([]);
  const [report, setReport] = useState<InvestImportReport | null>(null);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    try {
      const parsed = parseSheet(await file.arrayBuffer());
      if (!parsed.length) {
        toast.error("Nenhum lead encontrado — confira se a planilha tem a coluna \"Lead\".");
        return;
      }
      setFileName(file.name);
      setRows(parsed);
      setReport(null);
    } catch {
      toast.error("Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.");
    }
  };

  const importMutation = useMutation({
    mutationFn: () => importInvestLeads(rows),
    onSuccess: (result) => {
      setReport(result);
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
      toast.success(`Importação concluída: ${result.created} novos, ${result.updated} atualizados`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar planilha de leads</DialogTitle>
          <DialogDescription>
            Planilha da campanha BNF (colunas Lead, Origem, Produto, Pitch, PL, Etapa,
            Probabilidade, Responsável...). Leads com o mesmo nome são atualizados, não duplicados.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {!rows.length ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-6 py-10 text-slate-500 transition-colors hover:border-ouro hover:text-azul-profundo"
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm font-medium">Clique para escolher o arquivo</span>
            <span className="text-xs">.xlsx, .xls ou .csv</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-ouro-escuro" />
              <span className="truncate font-medium">{fileName}</span>
              <span className="ml-auto shrink-0 tabular-nums text-slate-500">
                {rows.length} lead{rows.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Lead</th>
                    <th className="px-2.5 py-1.5 font-medium">Responsável</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">PL</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2.5 py-1.5">{r.nome}</td>
                      <td className="px-2.5 py-1.5 text-slate-500">{r.responsavel || "—"}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-500">
                        {typeof r.pl === "number" ? r.pl.toLocaleString("pt-BR") : (r.pl ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div className="border-t border-slate-100 px-2.5 py-1.5 text-center text-[11px] text-slate-400">
                  + {rows.length - 50} leads no arquivo
                </div>
              )}
            </div>

            {report && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>
                  <strong>{report.created}</strong> criados · <strong>{report.updated}</strong>{" "}
                  atualizados (dedup por nome) · {report.total} linhas lidas
                </p>
                {report.responsaveisNaoMapeados.length > 0 && (
                  <p className="mt-1.5">
                    Responsáveis sem usuário correspondente (ficaram como texto):{" "}
                    <span className="font-medium">
                      {report.responsaveisNaoMapeados.join(", ")}
                    </span>
                  </p>
                )}
                {report.divergencias.length > 0 && (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-700">
                    <p className="font-semibold">
                      ⚠ {report.divergencias.length} lead(s) com divergência na planilha:
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {report.divergencias.slice(0, 12).map((d) => (
                        <li key={d.nome}>
                          <strong>{d.nome}</strong>: {d.detalhe}
                        </li>
                      ))}
                    </ul>
                    {report.divergencias.length > 12 && (
                      <p className="mt-1">+ {report.divergencias.length - 12} outros</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          {rows.length > 0 && !report && (
            <Button variant="ghost" onClick={reset} disabled={importMutation.isPending}>
              Trocar arquivo
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose}>
            {report ? "Fechar" : "Cancelar"}
          </Button>
          {rows.length > 0 && !report && (
            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
              {importMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Importar {rows.length} leads
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
