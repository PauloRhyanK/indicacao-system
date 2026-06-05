import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/cais-api";

const base =
  "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap";

const variants = {
  green: "bg-[#DCFCE7] text-[#166534]",
  amber: "bg-[#FEF3C7] text-[#92400E]",
  red: "bg-[#FEE2E2] text-[#991B1B]",
  gray: "bg-slate-200 text-slate-700",
  gold: "bg-[rgba(217,189,126,0.15)] text-[#9A7B3F] border border-[rgba(217,189,126,0.4)]",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  variant = "gray",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn(base, variants[variant], className)}>{children}</span>;
}

const statusVariant: Record<string, BadgeVariant> = {
  Novo: "gray",
  "Em Contato": "amber",
  "Proposta Enviada": "gold",
  Convertido: "green",
  Perdido: "red",
  // Status BASE_CRM mapeados diretamente quando exibidos sem adapter
  "Em negociação": "amber",
  "Em negociacao": "amber",
  "Follow-up": "gold",
  Fechado: "green",
};

export function StatusBadge({ status }: { status: LeadStatus | string }) {
  const variant = statusVariant[status] ?? "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
