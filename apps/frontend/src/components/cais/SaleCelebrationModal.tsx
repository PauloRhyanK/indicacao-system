import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./Button";
import { CommercialRolesList, ReferralChainList } from "./ReferralChainList";
import { formatBRL } from "@/lib/cais-api";
import type { SaleRegistrationResult } from "./SaleRegistrationForm";

export function SaleCelebrationModal({
  open,
  result,
  leadName,
  saleValue,
  onClose,
}: {
  open: boolean;
  result: SaleRegistrationResult | null;
  leadName?: string;
  saleValue?: number;
  onClose: () => void;
}) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-azul-profundo">Venda registrada!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-ouro/30 bg-ouro/5 px-4 py-3">
            <p className="text-[15px] font-semibold text-azul-profundo">
              {leadName ?? "Lead"}
            </p>
            {saleValue != null && saleValue > 0 ? (
              <p className="mt-1 text-[18px] font-bold text-ouro-escuro">
                {formatBRL(saleValue)}
              </p>
            ) : null}
          </div>

          <CommercialRolesList
            responsavel={result.responsavel}
            coVendedor={result.coVendedor}
            consortiumType={result.consortiumType}
          />

          <div>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
              Cadeia de indicação ativada
            </p>
            <ReferralChainList
              chain={result.bonusChain}
              treeTruncated={result.tree_truncated}
            />
          </div>

          <Button variant="gold" className="w-full" onClick={onClose}>
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
