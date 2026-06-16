import { Eye } from "lucide-react";
import type { AuthUser } from "@/lib/api/auth";

export function ReadOnlyBanner({ user }: { user: AuthUser }) {
  const roleLabel = user.roles.map((r) => r.name).join(", ") || "Consulta Confidencial";

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-azul-ceu/30 bg-linear-to-r from-azul-profundo/5 to-azul-medio/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azul-medio/15 text-azul-corporativo">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-azul-profundo">
            Modo consulta
          </p>
          <p className="mt-0.5 text-[13px] text-slate-600">
            Olá, <span className="font-medium text-azul-profundo">{user.name.split(" ")[0]}</span>.
            Você pode visualizar credores e exportar dados. Para alterar registros, peça o papel{" "}
            <em>Acesso Confidencial</em>.
          </p>
          <p className="mt-1 text-[12px] text-slate-500">Papel: {roleLabel}</p>
        </div>
      </div>
      <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-azul-ceu/40 bg-branco px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-azul-corporativo">
        Somente leitura
      </span>
    </div>
  );
}
