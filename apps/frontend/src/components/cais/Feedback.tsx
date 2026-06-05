export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={
        "h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-ouro " +
        (className ?? "")
      }
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-branco px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
        ✦
      </div>
      <h3 className="text-[15px] font-semibold text-azul-profundo">{title}</h3>
      <p className="max-w-sm text-[13px] text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-medium uppercase tracking-[1.5px] text-ouro">
      {children}
    </div>
  );
}
