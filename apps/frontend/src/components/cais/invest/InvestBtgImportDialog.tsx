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
  importInvestClientes,
  type InvestBtgImportRow,
  type InvestClienteImportReport,
} from "@/lib/invest-api";

interface InvestBtgImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const KNOWN_HEADERS: Record<string, keyof InvestBtgImportRow | "_extras"> = {
  conta: "conta",
  nome: "nome",
  assessor: "assessorNome",
  "e-mail comunicacao": "email",
  "pl total": "plTotal",
  "pl declarado": "plDeclarado",
  "faixa cliente": "faixaBtg",
  cidade: "cidade",
  estado: "estado",
  "profissao / setor": "profissao",
  profissao: "profissao",
  "tipo investidor": "tipoInvestidor",
  "e-mail assessor": "assessorEmail",
  "id cliente": "btgClienteId",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseBtgSheet(data: ArrayBuffer): InvestBtgImportRow[] {
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  let headerIdx = -1;
  const colMap: Partial<Record<number, keyof InvestBtgImportRow | "_extras">> = {};
  const extraCols: Record<number, string> = {};

  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const cells = grid[i].map(normalizeHeader);
    if (cells.includes("conta") && cells.includes("nome")) {
      headerIdx = i;
      cells.forEach((cell, col) => {
        const key = KNOWN_HEADERS[cell];
        if (key) {
          colMap[col] = key;
        } else if (cell) {
          colMap[col] = "_extras";
          extraCols[col] = cell;
        }
      });
      break;
    }
  }
  if (headerIdx < 0) return [];

  const rows: InvestBtgImportRow[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row: Partial<InvestBtgImportRow> = { dadosExtras: {} };
    const extras: Record<string, unknown> = {};

    for (const [colStr, key] of Object.entries(colMap)) {
      const col = Number(colStr);
      const value = grid[i][col];
      if (value === "" || value === undefined || value === null) continue;

      if (key === "_extras") {
        extras[extraCols[col] ?? `col_${col}`] = value;
        continue;
      }
      if (key === "plTotal" || key === "plDeclarado") {
        (row as Record<string, unknown>)[key] =
          typeof value === "number" ? value : String(value);
      } else {
        (row as Record<string, unknown>)[key] = String(value);
      }
    }

    if (row.conta && String(row.conta).trim() && row.nome && String(row.nome).trim()) {
      if (Object.keys(extras).length > 0) row.dadosExtras = extras;
      rows.push(row as InvestBtgImportRow);
    }
  }
  return rows;
}

export function InvestBtgImportDialog({ open, onClose }: InvestBtgImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<InvestBtgImportRow[]>([]);
  const [report, setReport] = useState<InvestClienteImportReport | null>(null);

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
      const parsed = parseBtgSheet(await file.arrayBuffer());
      if (!parsed.length) {
        toast.error('Nenhum cliente encontrado — confira se a planilha tem as colunas "Conta" e "Nome".');
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
    mutationFn: () => importInvestClientes(rows),
    onSuccess: (result) => {
      setReport(result);
      queryClient.invalidateQueries({ queryKey: ["invest-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["invest-cliente-assessores"] });
      toast.success(`Importação concluída: ${result.created} novos, ${result.updated} atualizados`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Base BTG</DialogTitle>
          <DialogDescription>
            Planilha exportada do BTG (colunas Conta, Nome, Assessor, PL Total, Faixa Cliente, etc.).
            Clientes existentes são atualizados pela conta.
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 transition-colors hover:border-ouro hover:bg-ouro/5">
              <Upload className="h-8 w-8 text-slate-400" />
              <span className="text-sm font-medium text-azul-profundo">
                {fileName ?? "Selecionar arquivo .xlsx"}
              </span>
              <span className="text-[11px] text-slate-500">Base BTG exportada (aba Export)</span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>

            {rows.length > 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-azul-profundo">
                  <FileSpreadsheet className="h-4 w-4" />
                  {rows.length} cliente{rows.length !== 1 ? "s" : ""} prontos para importar
                </div>
                <p className="mt-1 text-[12px] text-slate-500">
                  Ex.: {rows[0]?.nome} (conta {rows[0]?.conta})
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                disabled={!rows.length || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Importação concluída</p>
              <ul className="mt-2 space-y-1 text-[13px]">
                <li>Total processado: {report.total}</li>
                <li>Novos: {report.created}</li>
                <li>Atualizados: {report.updated}</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
