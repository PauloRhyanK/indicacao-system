import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { Button } from "./Button";
import { LeadCombobox } from "./LeadCombobox";
import { inputClass } from "./SlideOver";
import { fetchLookups, fetchProfiles, registerSale, type Lead, type RegisterSaleResult } from "@/lib/cais-api";
import { fetchMe } from "@/lib/api/auth";
import { fireCelebration } from "@/lib/confetti";

export interface SaleRegistrationResult {
  bonusChain: RegisterSaleResult["chain"];
  tree_truncated: boolean;
  purchaseId: string;
  leadId: string;
  responsavel?: string | null;
  coVendedor?: string | null;
  consortiumType?: string | null;
  saleValue?: number;
  leadName?: string;
}

function suggestCoVendedor(lead: Lead, currentUserId: string | undefined): string {
  if (lead.co_vendedor?.id) return lead.co_vendedor.id;
  if (
    lead.responsavel?.id &&
    currentUserId &&
    lead.responsavel.id !== currentUserId
  ) {
    return lead.responsavel.id;
  }
  return "";
}

export function SaleRegistrationForm({
  leadId: fixedLeadId,
  leadName: fixedLeadName,
  lead: initialLead,
  onSuccess,
  onRegistered,
  onCancel,
  showCancel = false,
  compact = false,
}: {
  leadId?: string;
  leadName?: string;
  lead?: Lead;
  onSuccess?: (result: SaleRegistrationResult) => void;
  onRegistered?: (result: SaleRegistrationResult) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const selectable = !fixedLeadId;

  const [selectedLeadId, setSelectedLeadId] = useState(fixedLeadId ?? "");
  const [pickedLead, setPickedLead] = useState<Lead | null>(initialLead ?? null);
  const [value, setValue] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [consortiumTypeId, setConsortiumTypeId] = useState("");
  const [coVendedorId, setCoVendedorId] = useState(initialLead?.co_vendedor?.id ?? "");

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const activeLeadId = fixedLeadId ?? selectedLeadId;
  const activeLead = initialLead ?? pickedLead;
  const activeLeadName =
    fixedLeadName ?? activeLead?.name ?? "";

  useEffect(() => {
    if (initialLead) {
      setPickedLead(initialLead);
      setCoVendedorId(initialLead.co_vendedor?.id ?? suggestCoVendedor(initialLead, me.data?.user.id));
    }
  }, [initialLead, me.data?.user.id]);

  const profileName = (id: string) =>
    (profiles.data ?? []).find((p) => p.id === id)?.name ?? null;

  const consortiumTypeName =
    (lookups.data?.consortiumTypes ?? []).find((t) => t.id === consortiumTypeId)?.name ?? null;

  const handleLeadSelect = (lead: Lead) => {
    setPickedLead(lead);
    setCoVendedorId(suggestCoVendedor(lead, me.data?.user.id));
  };

  const mutation = useMutation({
    mutationFn: () =>
      registerSale({
        lead_id: activeLeadId,
        sale_value: Number(value),
        sale_date: saleDate,
        consortium_type_id: consortiumTypeId || undefined,
        co_vendedor_id: coVendedorId || null,
      }),
    onSuccess: (data) => {
      fireCelebration();

      const mapped: SaleRegistrationResult = {
        bonusChain: data.chain,
        tree_truncated: data.tree_truncated,
        purchaseId: data.purchaseId,
        leadId: data.leadId,
        responsavel: activeLead?.responsavel?.name ?? null,
        coVendedor: coVendedorId ? profileName(coVendedorId) : null,
        consortiumType: consortiumTypeName,
        saleValue: Number(value),
        leadName: activeLeadName,
      };

      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["bonus-chain", data.leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });
      qc.invalidateQueries({ queryKey: ["personal-dashboard"] });

      setValue("");
      setSaleDate(new Date().toISOString().slice(0, 10));
      if (selectable) {
        setSelectedLeadId("");
        setPickedLead(null);
        setConsortiumTypeId("");
        setCoVendedorId("");
      }

      onSuccess?.(mapped);
      onRegistered?.(mapped);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (activeLeadId && Number(value) > 0) mutation.mutate();
      }}
      className="space-y-4"
    >
      {selectable ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Lead *
          </label>
          <LeadCombobox
            value={selectedLeadId}
            selectedLead={pickedLead}
            onChange={setSelectedLeadId}
            onLeadSelect={handleLeadSelect}
            disabled={mutation.isPending}
          />
        </div>
      ) : (
        <p className="text-[13px] text-slate-500">
          Lead: <span className="font-medium text-azul-profundo">{activeLeadName}</span>
        </p>
      )}

      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <div className={compact ? undefined : "sm:col-span-2"}>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Valor fechado (R$) *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
            autoFocus={!selectable}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Data da venda *
          </label>
          <input
            type="date"
            required
            className={inputClass}
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Tipo de consórcio
          </label>
          <select
            className={inputClass}
            value={consortiumTypeId}
            onChange={(e) => setConsortiumTypeId(e.target.value)}
          >
            <option value="">Selecione (opcional)</option>
            {(lookups.data?.consortiumTypes ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Co-vendedor
          </label>
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
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        O lead será marcado como <strong>Fechado</strong> e a meta do período será incrementada.
      </p>

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="gold"
          disabled={mutation.isPending || !activeLeadId}
          className="inline-flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {mutation.isPending ? "Salvando..." : "Confirmar Venda"}
        </Button>
        {showCancel && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
