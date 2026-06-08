import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { Field, inputClass, SlideOver } from "./SlideOver";
import { fetchLookups, fetchProfiles, updateLead, type Lead } from "@/lib/cais-api";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditLeadForm({
  open,
  onClose,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}) {
  const qc = useQueryClient();
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, enabled: open });

  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [responsavelId, setResponsavelId] = useState(lead.responsavel?.id ?? "");
  const [vendedorId, setVendedorId] = useState(lead.vendedor?.id ?? "");
  const [coVendedorId, setCoVendedorId] = useState(lead.co_vendedor?.id ?? "");
  const [statusSlug, setStatusSlug] = useState(lead.salesStatus?.slug ?? "");
  const [sourceSlug, setSourceSlug] = useState(lead.source?.slug ?? "");
  const [nextActionSlug, setNextActionSlug] = useState(lead.nextAction?.slug ?? "");
  const [followUpAt, setFollowUpAt] = useState(toDatetimeLocal(lead.next_follow_up_at));
  const [notes, setNotes] = useState(lead.notes ?? "");

  useEffect(() => {
    if (!open) return;
    setName(lead.name);
    setPhone(lead.phone);
    setResponsavelId(lead.responsavel?.id ?? "");
    setVendedorId(lead.vendedor?.id ?? "");
    setCoVendedorId(lead.co_vendedor?.id ?? "");
    setStatusSlug(lead.salesStatus?.slug ?? "");
    setSourceSlug(lead.source?.slug ?? "");
    setNextActionSlug(lead.nextAction?.slug ?? "");
    setFollowUpAt(toDatetimeLocal(lead.next_follow_up_at));
    setNotes(lead.notes ?? "");
  }, [open, lead]);

  const mutation = useMutation({
    mutationFn: () =>
      updateLead(lead.id, {
        name: name.trim(),
        phone: phone.trim(),
        salesStatusSlug: statusSlug || undefined,
        sourceSlug: sourceSlug || undefined,
        nextActionSlug: nextActionSlug || undefined,
        nextFollowUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
        notes: notes.trim(),
        responsavelId: responsavelId || null,
        vendedorId: vendedorId || null,
        coVendedorId: coVendedorId || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      onClose();
    },
  });

  return (
    <SlideOver open={open} onClose={onClose} title="Editar Lead">
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

        <Field label="Responsável pelo lead">
          <select
            className={inputClass}
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
          >
            <option value="">Não atribuído</option>
            {(profiles.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendedor">
          <select
            className={inputClass}
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
          >
            <option value="">Não atribuído</option>
            {(profiles.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Co-vendedor">
          <select
            className={inputClass}
            value={coVendedorId}
            onChange={(e) => setCoVendedorId(e.target.value)}
          >
            <option value="">Não atribuído</option>
            {(profiles.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={inputClass}
            value={statusSlug}
            onChange={(e) => setStatusSlug(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {(lookups.data?.statuses ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Origem">
          <select
            className={inputClass}
            value={sourceSlug}
            onChange={(e) => setSourceSlug(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {(lookups.data?.sources ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Próxima ação">
          <select
            className={inputClass}
            value={nextActionSlug}
            onChange={(e) => setNextActionSlug(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {(lookups.data?.nextActions ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Follow-up">
          <input
            type="datetime-local"
            className={inputClass}
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
          />
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
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
