import { useEffect } from "react";

export function SlideOver({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-azul-profundo/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full ${maxWidthClass} flex-col border-l border-slate-200 bg-branco shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[16px] font-semibold text-azul-profundo">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 transition-colors hover:text-azul-profundo"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[12px] font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-azul-profundo focus:outline-hidden focus:border-ouro focus:ring-3 focus:ring-[rgba(217,189,126,0.18)]";
