import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload, AlertCircle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  importInvestLeads,
  type InvestImportReport,
  type InvestImportRow,
} from "@/lib/invest-api";
import { fetchProfiles } from "@/lib/cais-api";
import { ApiError } from "@/lib/api/client";
import { previewEmailForName } from "@/lib/user-email";

interface InvestImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type UserMappingState = Record<
  string,
  {
    mode: "map" | "create";
    userId: string;
    createName: string;
  }
>;

const inputClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-branco px-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ouro-escuro";

function InvestMappingRow({
  value,
  profiles,
  state,
  onChange,
}: {
  value: string;
  profiles: { id: string; name: string }[];
  state: UserMappingState[string];
  onChange: (next: UserMappingState[string]) => void;
}) {
  const emailPreview =
    state.mode === "create" && state.createName.trim()
      ? previewEmailForName(state.createName)
      : null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <p className="mb-2 text-[12px] font-medium text-amber-900">
        Na planilha: <span className="font-bold text-azul-profundo">"{value}"</span>
      </p>
      <div className="mb-2 flex flex-wrap gap-3">
        <label className="flex items-center gap-1 text-[12px] cursor-pointer">
          <input
            type="radio"
            checked={state.mode === "map"}
            onChange={() => onChange({ ...state, mode: "map" })}
          />
          Mapear para existente
        </label>
        <label className="flex items-center gap-1 text-[12px] cursor-pointer">
          <input
            type="radio"
            checked={state.mode === "create"}
            onChange={() => onChange({ ...state, mode: "create" })}
          />
          Criar novo usuário
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
                A senha deverá ser definida em /primeiro-acesso.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [unmappedNames, setUnmappedNames] = useState<string[]>([]);
  const [mappingState, setMappingState] = useState<UserMappingState>({});

  const profiles = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    enabled: open,
  });

  const reset = () => {
    setFileName(null);
    setRows([]);
    setReport(null);
    setUnmappedNames([]);
    setMappingState({});
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
      setUnmappedNames([]);
      setMappingState({});
    } catch {
      toast.error("Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.");
    }
  };

  const importMutation = useMutation({
    mutationFn: () => {
      const aliasesToCreate = Object.entries(mappingState)
        .filter(([_, state]) => (state.mode === "map" && state.userId) || (state.mode === "create" && state.createName.trim()))
        .map(([aliasRaw, state]) => ({
          aliasRaw,
          action: state.mode,
          userId: state.mode === "map" ? state.userId : undefined,
          createName: state.mode === "create" ? state.createName.trim() : undefined,
        }));

      return importInvestLeads(rows, aliasesToCreate);
    },
    onSuccess: (result) => {
      setReport(result);
      setUnmappedNames([]);
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
      toast.success(`Importação concluída: ${result.created} novos, ${result.updated} atualizados`);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 400) {
        const payload = err.details as any;
        if (payload?.details?.code === "UNMAPPED_RESPONSAVEIS") {
          const names = payload.details.unmapped || [];
          setUnmappedNames(names);
          // Initialize mapping state for new names
          setMappingState((prev) => {
            const next = { ...prev };
            for (const n of names) {
              if (!next[n]) {
                next[n] = { mode: "map", userId: "", createName: n };
              }
            }
            return next;
          });
          toast.error("Existem responsáveis não mapeados na planilha.");
          return;
        }
      }
      toast.error(err.message);
    },
  });

  const allMapped =
    unmappedNames.length === 0 ||
    unmappedNames.every((name) => {
      const s = mappingState[name];
      if (!s) return false;
      if (s.mode === "create") return s.createName.trim().length > 0;
      return s.userId.length > 0;
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar planilha de leads</DialogTitle>
          <DialogDescription>
            {unmappedNames.length > 0
              ? "Associe os nomes da planilha aos usuários do CAIS."
              : "Planilha da campanha BNF (colunas Lead, Origem, Produto, Pitch, PL, Etapa, Probabilidade, Faixa, Responsavel, Contato, Proximo passo, Retorno, Obs)."}
          </DialogDescription>
        </DialogHeader>

        {unmappedNames.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Nomes não reconhecidos</p>
                  <p className="mt-1">
                    Encontramos nomes na coluna <b>Responsavel</b> que não correspondem a usuários ativos.
                    Por favor, mapeie-os abaixo para que o sistema lembre nas próximas importações.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {unmappedNames.map((name) => (
                <InvestMappingRow
                  key={name}
                  value={name}
                  profiles={profiles.data ?? []}
                  state={
                    mappingState[name] ?? {
                      mode: "map",
                      userId: "",
                      createName: name,
                    }
                  }
                  onChange={(next) => setMappingState((prev) => ({ ...prev, [name]: next }))}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={importMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={() => importMutation.mutate()} disabled={!allMapped || importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Confirmar mapeamento e importar
              </Button>
            </div>
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800">Resumo da importação</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Leads processados: <b>{report.total}</b></li>
                <li>Novos criados: <b className="text-emerald-600">{report.created}</b></li>
                <li>Atualizados (nome já existia): <b className="text-blue-600">{report.updated}</b></li>
              </ul>
              {report.divergencias && report.divergencias.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avisos</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-500">
                    {report.divergencias.map((msg, i) => (
                      <li key={i}>• <b>{msg.nome}</b>: {msg.detalhe}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Concluir</Button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-4">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition-colors hover:border-ouro-escuro hover:bg-ouro/10">
              <FileSpreadsheet className="mb-2 h-8 w-8 text-slate-400 group-hover:text-ouro-escuro" />
              <span className="text-sm font-medium text-slate-600 group-hover:text-ouro-escuro">
                Clique para selecionar a planilha (.xlsx, .csv)
              </span>
              <span className="mt-1 text-xs text-slate-400">
                A primeira linha com "Lead" definirá o cabeçalho.
              </span>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{fileName}</p>
                  <p className="text-xs text-slate-500">{rows.length} leads identificados.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={importMutation.isPending}>
                Trocar arquivo
              </Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Importar {rows.length} leads
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
