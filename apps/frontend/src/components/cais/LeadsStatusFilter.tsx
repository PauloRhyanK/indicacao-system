import { ChevronDown, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "./Button";
import type { LookupItem } from "@/lib/cais-api";

/**
 * Filtro rápido (multi-seleção) de status, sempre visível ao lado da busca.
 * Trabalha com slugs; os status vêm dos lookups. Não bloqueia o modal avançado.
 */
export function LeadsStatusFilter({
  statuses,
  selected,
  onChange,
}: {
  statuses: LookupItem[] | undefined;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const options = statuses ?? [];
  const count = selected.length;

  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Tag className="mr-1.5 h-4 w-4" />
          Status
          {count > 0 && (
            <span className="ml-1.5 rounded-full bg-ouro/20 px-2 py-0.5 text-[11px] font-semibold text-azul-profundo">
              {count}
            </span>
          )}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filtrar por status
          </span>
          {count > 0 && (
            <button
              type="button"
              className="text-[12px] text-azul-medio hover:text-azul-profundo"
              onClick={() => onChange([])}
            >
              Limpar
            </button>
          )}
        </div>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[13px] text-slate-400">
              Nenhum status disponível.
            </p>
          ) : (
            options.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-100"
              >
                <Checkbox
                  checked={selected.includes(s.slug)}
                  onCheckedChange={() => toggle(s.slug)}
                />
                <span className="text-[13px] text-azul-profundo">{s.name}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
