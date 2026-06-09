import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, ShoppingCart, Users } from "lucide-react";
import { Button } from "./Button";
import { ImportLeadsForm } from "./ImportLeadsForm";
import { ImportConsorcioForm } from "./ImportConsorcioForm";

type ImportType = "leads" | "sales";

const TYPE_META: Record<
  ImportType,
  { title: string; description: string; icon: typeof Users }
> = {
  leads: {
    title: "Leads",
    description: "Planilha BASE_CRM com colunas ID, Nome do cliente, status, etc.",
    icon: Users,
  },
  sales: {
    title: "Vendas (campanha)",
    description: "Planilha de consórcio com CLIENTE, VENDEDOR, CO VENDEDOR e TOTAL.",
    icon: ShoppingCart,
  },
};

function ImportTypePicker({
  onSelect,
  onCancel,
}: {
  onSelect: (type: ImportType) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-slate-600">O que deseja importar?</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(["leads", "sales"] as const).map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-ouro hover:bg-ouro/5"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-azul-profundo" />
                <span className="text-[14px] font-semibold text-azul-profundo">{meta.title}</span>
              </div>
              <p className="text-[12px] text-slate-500">{meta.description}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function ImportExcelDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [importType, setImportType] = useState<ImportType | null>(null);

  function handleClose() {
    setImportType(null);
    onClose();
  }

  if (!open) return null;

  const meta = importType ? TYPE_META[importType] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-azul-profundo/40 animate-fade-in" onClick={handleClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-branco p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-ouro/20 p-2">
            <FileSpreadsheet className="h-5 w-5 text-azul-profundo" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {importType && (
                <button
                  type="button"
                  onClick={() => setImportType(null)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-azul-profundo"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-[16px] font-semibold text-azul-profundo">Importar Excel</h2>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {meta
                ? meta.description
                : "Escolha o tipo de importação e selecione o arquivo."}
            </p>
          </div>
        </div>

        <div className="mt-5">
          {!importType ? (
            <ImportTypePicker onSelect={setImportType} onCancel={handleClose} />
          ) : importType === "leads" ? (
            <ImportLeadsForm onDone={handleClose} onCancel={handleClose} />
          ) : (
            <ImportConsorcioForm onDone={handleClose} onCancel={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
