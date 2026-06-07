import { SaleRegistrationForm } from "./SaleRegistrationForm";

export function RegisterSaleDialog({
  open,
  onClose,
  leadId,
  leadName,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-azul-profundo/40 animate-fade-in" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-branco p-6 shadow-xl">
        <h2 className="text-[16px] font-semibold text-azul-profundo">Registrar Venda</h2>
        <div className="mt-4">
          <SaleRegistrationForm
            key={open ? leadId : "closed"}
            leadId={leadId}
            leadName={leadName}
            showCancel
            modal
            compact
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
