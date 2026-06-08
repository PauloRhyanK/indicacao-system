import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { Button } from "./Button";
import { CommercialRolesList, ReferralChainList } from "./ReferralChainList";
import { inputClass } from "./SlideOver";
import {
  fetchAllLeads,
  fetchLookups,
  fetchProfiles,
  isLeadClosed,
  registerSale,
  type Lead,
  type RegisterSaleResult,
} from "@/lib/cais-api";
import { fireCelebration } from "@/lib/confetti";

export interface SaleRegistrationResult {
  bonusChain: RegisterSaleResult["chain"];
  tree_truncated: boolean;
  purchaseId: string;
  leadId: string;
  responsavel?: string | null;
  vendedor?: string | null;
  coVendedor?: string | null;
  consortiumType?: string | null;
}

export function SaleRegistrationForm({
  leadId: fixedLeadId,
  leadName: fixedLeadName,
  lead: initialLead,
  onSuccess,
  onRegistered,
  onCancel,
  showCancel = false,
  modal = false,
  compact = false,
}: {
  leadId?: string;
  leadName?: string;
  lead?: Lead;
  onSuccess?: (result: SaleRegistrationResult) => void;
  onRegistered?: (result: SaleRegistrationResult) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  modal?: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const selectable = !fixedLeadId;
  const useGrid = !compact && !modal;

  const [selectedLeadId, setSelectedLeadId] = useState(fixedLeadId ?? "");
  const [value, setValue] = useState("");
  const [consortiumTypeId, setConsortiumTypeId] = useState("");
  const [vendedorId, setVendedorId] = useState(initialLead?.vendedor?.id ?? "");
  const [coVendedorId, setCoVendedorId] = useState(initialLead?.co_vendedor?.id ?? "");
  const [result, setResult] = useState<SaleRegistrationResult | null>(null);

  const leads = useQuery({
    queryKey: ["leads-all"],
    queryFn: fetchAllLeads,
    enabled: selectable,
  });

  const lookups = useQuery({
    queryKey: ["lookups"],
    queryFn: fetchLookups,
  });

  const profiles = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const openLeads = (leads.data ?? []).filter((l) => !isLeadClosed(l));
  const activeLeadId = fixedLeadId ?? selectedLeadId;
  const activeLeadName =
    fixedLeadName ?? openLeads.find((l) => l.id === selectedLeadId)?.name ?? "";
  const activeLead = initialLead ?? openLeads.find((l) => l.id === activeLeadId);

  const profileName = (id: string) =>
    (profiles.data ?? []).find((p) => p.id === id)?.name ?? null;

  const consortiumTypeName =
    (lookups.data?.consortiumTypes ?? []).find((t) => t.id === consortiumTypeId)?.name ??
    null;

  const mutation = useMutation({
    mutationFn: () =>
      registerSale({
        lead_id: activeLeadId,
        sale_value: Number(value),
        consortium_type_id: consortiumTypeId || undefined,
        vendedor_id: vendedorId || null,
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
        vendedor: vendedorId ? profileName(vendedorId) : null,
        coVendedor: coVendedorId ? profileName(coVendedorId) : null,
        consortiumType: consortiumTypeName,
      };

      if (modal) {
        setResult(mapped);
      }

      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["bonus-chain", data.leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-all"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["daily-goal-today"] });

      setValue("");
      if (!selectable) setConsortiumTypeId("");

      onSuccess?.(mapped);
      onRegistered?.(mapped);
    },
  });

  if (result && modal) {
    return (
      <div className="space-y-4">
        <CommercialRolesList
          responsavel={result.responsavel}
          vendedor={result.vendedor}
          coVendedor={result.coVendedor}
          consortiumType={result.consortiumType}
        />
        <div>
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
            Cadeia de indicação
          </p>
          <ReferralChainList
            chain={result.bonusChain}
            treeTruncated={result.tree_truncated}
          />
        </div>
        <Button variant="gold" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    );
  }

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
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Lead</label>
          <select
            required
            className={inputClass}
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
          >
            <option value="">Selecione um lead</option>
            {openLeads.map((l: Lead) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-[13px] text-slate-500">
          Lead: <span className="font-medium text-azul-profundo">{activeLeadName}</span>
        </p>
      )}

      <div className={useGrid ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
            Valor fechado (R$)
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
          <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Vendedor</label>
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
