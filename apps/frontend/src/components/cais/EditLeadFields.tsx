import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, inputClass } from "./SlideOver";
import {
  fetchAllLeads,
  fetchLookups,
  fetchProfiles,
  updateLead,
  OPPORTUNITY_GRADE_LABELS,
  type Lead,
  type OpportunityGrade,
} from "@/lib/cais-api";

interface RefOption {
  id: string;
  label: string;
  type: "user" | "lead";
}

export type EditLeadFieldsHandle = {
  submit: () => Promise<void>;
  isDirty: () => boolean;
};

export const EditLeadFields = forwardRef<
  EditLeadFieldsHandle,
  {
    lead: Lead;
    enabled?: boolean;
    readOnly?: boolean;
  }
>(function EditLeadFields({ lead, enabled = true, readOnly = false }, ref) {
  const qc = useQueryClient();
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const profiles = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    enabled,
  });
  const leads = useQuery({
    queryKey: ["leads-all"],
    queryFn: fetchAllLeads,
    enabled,
  });

  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [responsavelId, setResponsavelId] = useState(lead.responsavel?.id ?? "");
  const [coVendedorId, setCoVendedorId] = useState(lead.co_vendedor?.id ?? "");
  const [firstContactId, setFirstContactId] = useState(lead.first_contact?.id ?? "");
  const [statusSlug, setStatusSlug] = useState(lead.salesStatus?.slug ?? "");
  const [opportunityGrade, setOpportunityGrade] = useState<OpportunityGrade | "">(
    lead.opportunity_grade ?? "",
  );
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [offeredAmount, setOfferedAmount] = useState(
    lead.offered_amount != null ? String(lead.offered_amount) : "",
  );
  const [refSearch, setRefSearch] = useState("");
  const [refSelected, setRefSelected] = useState<RefOption | null>(null);
  const [showOpts, setShowOpts] = useState(false);

  const refOptions: RefOption[] = useMemo(() => {
    const us = (profiles.data ?? []).map((p) => ({
      id: p.id,
      label: `${p.name} (Usuário)`,
      type: "user" as const,
    }));
    const ls = (leads.data ?? [])
      .filter((l) => l.id !== lead.id)
      .map((l) => ({
        id: l.id,
        label: `${l.name} (Lead)`,
        type: "lead" as const,
      }));
    return [...us, ...ls];
  }, [profiles.data, leads.data, lead.id]);

  const filteredRefs = refOptions.filter((o) =>
    o.label.toLowerCase().includes(refSearch.toLowerCase()),
  );

  useEffect(() => {
    if (!enabled) return;
    setName(lead.name);
    setPhone(lead.phone);
    setResponsavelId(lead.responsavel?.id ?? "");
    setCoVendedorId(lead.co_vendedor?.id ?? "");
    setFirstContactId(lead.first_contact?.id ?? "");
    setStatusSlug(lead.salesStatus?.slug ?? "");
    setOpportunityGrade(lead.opportunity_grade ?? "");
    setNotes(lead.notes ?? "");
    setOfferedAmount(lead.offered_amount != null ? String(lead.offered_amount) : "");
    if (lead.referrer) {
      setRefSelected({
        id: lead.referrer.id,
        label: `${lead.referrer.name} (${lead.referrer.type === "user" ? "Usuário" : "Lead"})`,
        type: lead.referrer.type,
      });
      setRefSearch("");
    } else {
      setRefSelected(null);
      setRefSearch("");
    }
  }, [enabled, lead]);

  const parseAmount = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const buildPayload = () => {
    const offered = parseAmount(offeredAmount);

    let referrer: { type: "USER" | "LEAD"; id: string } | null | undefined;
    if (refSelected) {
      referrer = {
        type: refSelected.type === "user" ? "USER" : "LEAD",
        id: refSelected.id,
      };
    } else if (lead.referrer) {
      referrer = null;
    }

    return {
      name: name.trim(),
      phone: phone.trim(),
      salesStatusSlug: statusSlug || undefined,
      opportunityGrade: opportunityGrade || null,
      notes: notes.trim(),
      responsavelId: responsavelId || null,
      coVendedorId: coVendedorId || null,
      firstContactId: firstContactId || null,
      offeredAmount: offered,
      ...(referrer !== undefined ? { referrer } : {}),
    };
  };

  const isDirty = () => {
    const payload = buildPayload();
    const offered = parseAmount(offeredAmount);
    const referrerId = refSelected?.id ?? null;
    const leadReferrerId = lead.referrer?.id ?? null;

    return (
      payload.name !== lead.name ||
      payload.phone !== lead.phone ||
      (payload.salesStatusSlug ?? "") !== (lead.salesStatus?.slug ?? "") ||
      (payload.opportunityGrade ?? null) !== (lead.opportunity_grade ?? null) ||
      payload.notes !== (lead.notes ?? "") ||
      (payload.responsavelId ?? "") !== (lead.responsavel?.id ?? "") ||
      (payload.coVendedorId ?? "") !== (lead.co_vendedor?.id ?? "") ||
      (payload.firstContactId ?? "") !== (lead.first_contact?.id ?? "") ||
      (offered ?? null) !== (lead.offered_amount ?? null) ||
      referrerId !== leadReferrerId
    );
  };

  const mutation = useMutation({
    mutationFn: () => updateLead(lead.id, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      qc.invalidateQueries({ queryKey: ["referrals"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      qc.invalidateQueries({ queryKey: ["personal-dashboard"] });
    },
  });

  useImperativeHandle(ref, () => ({
    submit: async () => {
      if (readOnly || !isDirty()) return;
      await mutation.mutateAsync();
    },
    isDirty,
  }));

  const disabled = readOnly || mutation.isPending;

  return (
    <div>
      <Field label="Nome *">
        <input
          required
          disabled={disabled}
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Celular *">
        <input
          required
          disabled={disabled}
          className={inputClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-0000"
        />
      </Field>

      <Field label="Valor ofertado (R$)">
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={disabled}
          className={inputClass}
          value={offeredAmount}
          onChange={(e) => setOfferedAmount(e.target.value)}
          placeholder="0,00"
        />
      </Field>

      <Field label="Indicado por">
        <div className="relative">
          <input
            disabled={disabled}
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
          {refSelected && !readOnly && (
            <button
              type="button"
              className="mt-1 text-[12px] text-slate-500 hover:text-azul-profundo"
              onClick={() => {
                setRefSelected(null);
                setRefSearch("");
              }}
            >
              Limpar indicador
            </button>
          )}
          {showOpts && refSearch && !refSelected && filteredRefs.length > 0 && !readOnly && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {filteredRefs.slice(0, 8).map((o) => (
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

      <Field label="Primeiro contato">
        <select
          disabled={disabled}
          className={inputClass}
          value={firstContactId}
          onChange={(e) => setFirstContactId(e.target.value)}
        >
          <option value="">Não atribuído</option>
          {(profiles.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Vendedor responsável">
        <select
          disabled={disabled}
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

      <Field label="Co-vendedor">
        <select
          disabled={disabled}
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
          disabled={disabled}
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

      <Field label="Grau de oportunidade">
        <select
          disabled={disabled}
          className={inputClass}
          value={opportunityGrade}
          onChange={(e) =>
            setOpportunityGrade((e.target.value || "") as OpportunityGrade | "")
          }
        >
          <option value="">— Selecione —</option>
          {(Object.entries(OPPORTUNITY_GRADE_LABELS) as [OpportunityGrade, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </Field>

      <Field label="Observações">
        <textarea
          disabled={disabled}
          className={inputClass + " min-h-[90px] resize-y"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {mutation.isError && (
        <p className="mb-3 text-[12px] text-status-red">
          Erro ao salvar lead. Tente novamente.
        </p>
      )}
    </div>
  );
});
