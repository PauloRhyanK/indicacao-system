import { SlideOver } from "./SlideOver";
import { SaleRegistrationForm } from "./SaleRegistrationForm";
import type { SaleRegistrationResult } from "./SaleRegistrationForm";

export function SaleRegistrationDrawer({
  open,
  onClose,
  onRegistered,
}: {
  open: boolean;
  onClose: () => void;
  onRegistered?: (result: SaleRegistrationResult) => void;
}) {
  return (
    <SlideOver open={open} onClose={onClose} title="Registrar nova venda">
      <SaleRegistrationForm
        onRegistered={(result) => {
          onRegistered?.(result);
          onClose();
        }}
        onCancel={onClose}
        showCancel
      />
    </SlideOver>
  );
}
