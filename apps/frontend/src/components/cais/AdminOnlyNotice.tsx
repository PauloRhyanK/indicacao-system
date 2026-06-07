import { Eye } from "lucide-react";

export function AdminOnlyNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-slate-200 border-l-[3px] border-l-ouro bg-slate-50 px-4 py-3.5">
      <Eye className="mt-0.5 h-5 w-5 shrink-0 text-azul-medio" />
      <div>
        <p className="text-[14px] font-medium text-azul-profundo">Modo visualização</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">
          Apenas administradores podem alterar metas. Você pode consultar os valores abaixo.
        </p>
      </div>
    </div>
  );
}
