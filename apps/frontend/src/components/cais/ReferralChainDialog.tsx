import { Link } from "@tanstack/react-router";
import { Network, X } from "lucide-react";
import { ReferralChainDiagram } from "./ReferralChainDiagram";
import type { BonusChainNode } from "@/lib/cais-api";

export function ReferralChainDialog({
  open,
  onClose,
  lead,
  chain,
  treeTruncated,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  lead: { id: string; name: string; phone: string } | null;
  chain: BonusChainNode[];
  treeTruncated?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-azul-profundo/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-branco p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-chain-dialog-title"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-md bg-ouro/20 p-2">
            <Network className="h-5 w-5 text-azul-profundo" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="referral-chain-dialog-title"
              className="text-[16px] font-semibold text-azul-profundo"
            >
              Cadeia de indicação
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">{lead.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-azul-profundo"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ReferralChainDiagram
          chain={chain}
          currentLead={{ name: lead.name, phone: lead.phone }}
          treeTruncated={treeTruncated}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />

        <div className="mt-5 border-t border-slate-100 pt-4">
          <Link
            to="/leads/$id"
            params={{ id: lead.id }}
            className="text-[13px] font-medium text-azul-medio hover:text-azul-profundo"
            onClick={onClose}
          >
            Abrir ficha completa →
          </Link>
        </div>
      </div>
    </div>
  );
}
