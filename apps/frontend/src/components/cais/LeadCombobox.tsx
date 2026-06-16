import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchLeads, isLeadClosed, type Lead } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

export function LeadCombobox({
  value,
  onChange,
  onLeadSelect,
  selectedLead,
  disabled,
}: {
  value: string;
  onChange: (leadId: string) => void;
  onLeadSelect?: (lead: Lead) => void;
  selectedLead?: Lead | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const leads = useQuery({
    queryKey: ["leads-search", debouncedSearch],
    queryFn: () => fetchLeads({ search: debouncedSearch || undefined, limit: 20 }),
    enabled: open,
  });

  const openLeads = (leads.data?.leads ?? []).filter((l) => !isLeadClosed(l));
  const selected = openLeads.find((l) => l.id === value) ?? (selectedLead?.id === value ? selectedLead : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between border-slate-300 bg-branco font-normal text-azul-profundo hover:bg-slate-50"
        >
          <span className="truncate">
            {selected ? selected.name : "Buscar lead por nome ou telefone…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite nome ou telefone…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {leads.isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">Buscando…</div>
            ) : openLeads.length === 0 ? (
              <CommandEmpty>Nenhum lead em aberto encontrado.</CommandEmpty>
            ) : (
              <CommandGroup>
                {openLeads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={lead.id}
                    onSelect={() => {
                      onChange(lead.id);
                      onLeadSelect?.(lead);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === lead.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{lead.name}</div>
                      {lead.phone ? (
                        <div className="truncate text-[12px] text-slate-500">{lead.phone}</div>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
