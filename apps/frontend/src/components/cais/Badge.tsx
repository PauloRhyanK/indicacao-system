import { cn } from "@/lib/utils";

const base =
  "inline-flex max-w-full min-w-0 items-center truncate text-[11px] font-medium px-2 py-0.5 rounded-full";

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
  title,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(base, variants[variant], className)} title={title}>
      {children}
    </span>
  );
}

const slugVariant: Record<string, BadgeVariant> = {
  fechado: "green",
  perdido: "red",
  "em-negociacao": "amber",
  "follow-up": "gold",
  pensando: "amber",
  "proposta-enviada": "gold",
  "reuniao-agendada": "gray",
  "reuniao-realizada": "gray",
  "sem-retorno": "red",
  reagendar: "amber",
  "mandar-proposta": "gold",
};

export function StatusBadge({
  status,
  slug,
  className,
  compact = false,
}: {
  status: string;
  slug?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const variant: BadgeVariant = (slug && slugVariant[slug]) || "gray";
  return (
    <Badge
      variant={variant}
      className={cn(
        compact &&
          "inline-block h-6 max-w-full truncate rounded-md px-2 py-0 text-[11px] leading-6",
        className,
      )}
      title={status}
    >
      {status}
    </Badge>
  );
}
