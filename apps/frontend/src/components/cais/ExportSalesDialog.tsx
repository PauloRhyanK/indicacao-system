import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "./Button";
import { FileSpreadsheet, FileText, Check, Loader2, Download } from "lucide-react";
import { formatBRL, formatDate, type Sale } from "@/lib/cais-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportSalesDialogProps {
  open: boolean;
  onClose: () => void;
  sales: Sale[];
}

type ExportFormat = "excel" | "pdf";
type ColumnGroup = "venda" | "lead";

interface ExportColumn {
  id: string;
  label: string;
  group: ColumnGroup;
  extractor: (sale: Sale) => string | number | boolean;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    id: "sold_at",
    label: "Data da Venda",
    group: "venda",
    extractor: (s) => formatDate(s.sold_at),
  },
  {
    id: "responsavel",
    label: "Vendedor Responsável",
    group: "venda",
    extractor: (s) => s.commercial.responsavel?.name ?? "—",
  },
  {
    id: "co_vendedor",
    label: "Co-Vendedor",
    group: "venda",
    extractor: (s) => s.commercial.co_vendedor?.name ?? "—",
  },
  {
    id: "consortium_type",
    label: "Tipo de Consórcio",
    group: "venda",
    extractor: (s) => s.consortium_type ?? "—",
  },
  {
    id: "sale_value",
    label: "Valor da Venda",
    group: "venda",
    extractor: (s) => s.sale_value,
  },
  {
    id: "boleto_paid",
    label: "Status do Boleto",
    group: "venda",
    extractor: (s) => (s.boleto_paid ? "Pago" : "Pendente"),
  },
  {
    id: "external_code",
    label: "Código da Venda",
    group: "venda",
    extractor: (s) => s.commercial.external_code ?? "—",
  },
  {
    id: "lead_name",
    label: "Nome do Cliente",
    group: "lead",
    extractor: (s) => s.lead_name,
  },
  {
    id: "lead_phone",
    label: "Telefone do Lead",
    group: "lead",
    extractor: (s) => s.lead_phone ?? "—",
  },
  {
    id: "lead_created_at",
    label: "Data de Criação do Lead",
    group: "lead",
    extractor: (s) => (s.lead_created_at ? formatDate(s.lead_created_at) : "—"),
  },
  {
    id: "lead_notes",
    label: "Observações do Lead",
    group: "lead",
    extractor: (s) => s.lead_notes ?? "—",
  },
];

const GROUP_LABELS: Record<ColumnGroup, string> = {
  venda: "Dados da Venda",
  lead: "Dados do Lead",
};

const DEFAULT_COLS = ["sold_at", "lead_name", "responsavel", "consortium_type", "sale_value", "boleto_paid"];

const FORMATS: { id: ExportFormat; label: string; description: string; icon: typeof FileSpreadsheet; iconClass: string }[] = [
  {
    id: "excel",
    label: "Excel (.xlsx)",
    description: "Planilha editável para análises e filtros.",
    icon: FileSpreadsheet,
    iconClass: "text-emerald-600",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Relatório formatado, pronto para impressão.",
    icon: FileText,
    iconClass: "text-rose-600",
  },
];

export function ExportSalesDialog({ open, onClose, sales }: ExportSalesDialogProps) {
  const [selectedCols, setSelectedCols] = useState<string[]>(DEFAULT_COLS);
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [isExporting, setIsExporting] = useState(false);

  // Reset format selection each time the dialog opens, keeping column choices.
  useEffect(() => {
    if (open) setFormat("excel");
  }, [open]);

  const columnsByGroup = useMemo(() => {
    return (["venda", "lead"] as ColumnGroup[]).map((group) => ({
      group,
      columns: EXPORT_COLUMNS.filter((c) => c.group === group),
    }));
  }, []);

  const recordCount = sales.length;
  const hasRecords = recordCount > 0;
  const canExport = hasRecords && selectedCols.length > 0 && !isExporting;

  const handleToggleCol = (id: string, checked: boolean) => {
    setSelectedCols((prev) =>
      checked ? [...prev, id] : prev.filter((colId) => colId !== id),
    );
  };

  const handleSelectAll = () => {
    setSelectedCols(EXPORT_COLUMNS.map((c) => c.id));
  };

  const handleSelectNone = () => {
    setSelectedCols([]);
  };

  const getFilteredData = (activeCols: ExportColumn[]) => {
    return sales.map((sale) => {
      const row: Record<string, string | number | boolean> = {};
      activeCols.forEach((c) => {
        row[c.label] = c.extractor(sale);
      });
      return row;
    });
  };

  const exportExcel = () => {
    const activeCols = EXPORT_COLUMNS.filter((c) => selectedCols.includes(c.id));
    const rawRows = getFilteredData(activeCols);

    const worksheet = XLSX.utils.json_to_sheet(rawRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    // Auto-fit columns
    const maxColWidths = activeCols.map((c) => {
      let maxLen = c.label.length;
      rawRows.forEach((row) => {
        const val = String(row[c.label] ?? "");
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(40, maxLen + 3) };
    });
    worksheet["!cols"] = maxColWidths;

    XLSX.writeFile(workbook, `vendas_cais_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    const activeCols = EXPORT_COLUMNS.filter((c) => selectedCols.includes(c.id));
    const headers = activeCols.map((c) => c.label);
    const body = sales.map((sale) =>
      activeCols.map((c) => {
        const val = c.extractor(sale);
        if (c.id === "sale_value") {
          return formatBRL(val as number);
        }
        return String(val ?? "");
      }),
    );

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Title & Branding
    doc.setFontSize(16);
    doc.setTextColor(36, 61, 79); // #243d4f (azul-profundo)
    doc.text("Relatório de Vendas — CAIS Consórcios", 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")} · ${sales.length} vendas filtradas`, 14, 20);

    // Render Table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 24,
      theme: "striped",
      headStyles: {
        fillColor: [36, 61, 79], // #243d4f (azul-profundo)
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85], // Slate-700
      },
      margin: { top: 25, right: 14, bottom: 15, left: 14 },
    });

    doc.save(`vendas_cais_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    // Yield to the browser so the spinner paints before the synchronous file generation runs.
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      if (format === "excel") {
        exportExcel();
      } else {
        exportPDF();
      }
      toast.success(
        `${format === "excel" ? "Excel" : "PDF"} exportado com sucesso! (${recordCount} venda${recordCount !== 1 ? "s" : ""})`,
      );
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(`Ocorreu um erro ao gerar o arquivo ${format === "excel" ? "Excel" : "PDF"}.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden bg-white p-0">
        <DialogHeader className="space-y-1.5 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul-profundo/5 text-azul-profundo">
              <Download className="h-[18px] w-[18px]" />
            </span>
            <DialogTitle className="text-[18px] font-semibold text-azul-profundo">
              Exportar Vendas
            </DialogTitle>
          </div>
          <DialogDescription className="text-[13px] text-slate-500">
            Escolha o formato e as colunas que deseja incluir no arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Step 1 — Format */}
          <section className="space-y-2.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              1 · Formato do arquivo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const active = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer",
                      active
                        ? "border-azul-medio bg-azul-medio/5 ring-1 ring-azul-medio"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", fmt.iconClass)} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-700">{fmt.label}</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{fmt.description}</p>
                    </div>
                    {active ? (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-azul-medio text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2 — Columns */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                2 · Colunas{" "}
                <span className="ml-1 normal-case text-slate-400">
                  ({selectedCols.length} de {EXPORT_COLUMNS.length})
                </span>
              </h3>
              <div className="flex gap-2 text-[12px]">
                <button
                  type="button"
                  className="font-medium text-azul-medio hover:text-azul-profundo hover:underline"
                  onClick={handleSelectAll}
                >
                  Selecionar todas
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  className="font-medium text-azul-medio hover:text-azul-profundo hover:underline"
                  onClick={handleSelectNone}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {columnsByGroup.map(({ group, columns }) => (
                <div key={group} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {GROUP_LABELS[group]}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {columns.map((col) => {
                      const checked = selectedCols.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          htmlFor={`col-${col.id}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors select-none",
                            checked
                              ? "border-azul-medio/30 bg-azul-medio/5"
                              : "border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          <Checkbox
                            id={`col-${col.id}`}
                            checked={checked}
                            onCheckedChange={(value) => handleToggleCol(col.id, !!value)}
                          />
                          <span className="text-[13px] font-medium text-slate-600">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-[12.5px] text-slate-500">
            {hasRecords ? (
              <>
                <span className="font-semibold text-slate-700">{recordCount}</span> venda
                {recordCount !== 1 ? "s" : ""} no filtro atual
              </>
            ) : (
              "Nenhuma venda no filtro atual"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-[13px]">
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleExport}
              disabled={!canExport}
              className="inline-flex items-center gap-2 text-[13px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exportar {format === "excel" ? "Excel" : "PDF"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
