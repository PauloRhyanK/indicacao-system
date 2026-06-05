import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./Button";
import { Field, inputClass, SlideOver } from "./SlideOver";
import {
  createLead,
  fetchProfiles,
  fetchLeads,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/cais-api";

interface RefOption {
  id: string;
  label: string;
  type: "user" | "lead";
}

export function NewLeadForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo");
  const [notes, setNotes] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [refSelected, setRefSelected] = useState<RefOption | null>(null);
  const [showOpts, setShowOpts] = useState(false);

  const options: RefOption[] = useMemo(() => {
    const us = (profiles.data ?? []).map((p) => ({
      id: p.id,
      label: `${p.name} (Usuário)`,
      type: "user" as const,
    }));
    const ls = (leads.data ?? []).map((l) => ({
      id: l.id,
      label: `${l.name} (Lead)`,
      type: "lead" as const,
    }));
    return [...us, ...ls];
  }, [profiles.data, leads.data]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(refSearch.toLowerCase()),
  );

  const reset = () => {
    setName("");
    setPhone("");
    setStatus("Novo");
    setNotes("");
    setRefSearch("");
    setRefSelected(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      createLead({
        name: name.trim(),
        phone: phone.trim(),
        status,
        notes: notes.trim(),
        referrer_type: refSelected?.type ?? null,
        referrer_id: refSelected?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      reset();
      onClose();
    },
  });

  return (
    <SlideOver open={open} onClose={onClose} title="Novo Lead">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label="Nome *">
          <input
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Celular *">
          <input
            required
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-0000"
          />
        </Field>

        <Field label="Indicado por">
          <div className="relative">
            <input
              className={inputClass}
              value={refSelected ? refSelected.label : refSearch}
              onChange={(e) => {
                setRefSelected(null);
                setRefSearch(e.target.value);
                setShowOpts(true);
              }}
              onFocus={() => setShowOpts(true)}
              placeholder="Buscar usuário ou lead..."
            />
            {showOpts && refSearch && !refSelected && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                {filtered.slice(0, 8).map((o) => (
                  <button
                    type="button"
                    key={`${o.type}-${o.id}`}
                    className="block w-full px-3 py-2 text-left text-[13px] text-azul-profundo hover:bg-slate-100"
                    onClick={() => {
                      setRefSelected(o);
                      setShowOpts(false);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Status">
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observações">
          <textarea
            className={inputClass + " min-h-[90px] resize-y"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {mutation.isError && (
          <p className="mb-3 text-[12px] text-status-red">
            Erro ao salvar. Tente novamente.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="gold" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar Lead"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
