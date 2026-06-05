import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[0.3px] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden",
  {
    variants: {
      variant: {
        primary:
          "bg-azul-profundo text-branco px-[22px] py-[11px] text-[14px] hover:bg-azul-marinho hover:-translate-y-px",
        gold: "bg-ouro text-azul-profundo px-[22px] py-[11px] text-[14px] font-semibold hover:bg-ouro-claro hover:-translate-y-px",
        ghost:
          "bg-transparent text-azul-profundo border border-slate-200 px-[18px] py-[10px] text-[13px] hover:bg-slate-100",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, block, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
