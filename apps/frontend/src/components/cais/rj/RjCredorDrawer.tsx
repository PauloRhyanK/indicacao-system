import { useEffect, useState } from "react";
import { Button } from "@/components/cais/Button";
import { Field, SlideOver, inputClass } from "@/components/cais/SlideOver";
import { RjCredorReunioesSection } from "@/components/cais/rj/RjCredorReunioesSection";
import type { RjCredor, RjCredorInput, RjStatus } from "@/lib/cais-api";
import {
  RJ_CLASSE_VALUES,
  RJ_MOTIVO_VALUES,
  RJ_STATUS_VALUES,
  RJ_CLASSE_LABELS,
  RJ_MOTIVO_LABELS,
  RJ_STATUS_LABELS,
  type RjClasse,
  type RjMotivo,
} from "@/lib/rj-constants";
import { formatRjPlain, parseRjNum } from "@/lib/rj-format";

const emptyForm = (): RjCredorInput => ({
  nome: "",
  sujeito: true,
  classe: "III",
  motivo: null,
  valor: 0,
  status: "juridico",
  contato: "",
  passo: "",
  retorno: null,
  obs: "",
});

export function RjCredorDrawer({
  open,
  credor,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  credor: RjCredor | null;
  onClose: () => void;
  onSave: (input: RjCredorInput, id?: string) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<RjCredorInput>(emptyForm);
  const [valorInput, setValorInput] = useState("");

  useEffect(() => {
    if (!open) return;
    if (credor) {
      setForm({
        nome: credor.nome,
        sujeito: credor.sujeito,
        classe: credor.classe,
        motivo: credor.motivo,
        valor: credor.valor,
        status: credor.status,
        contato: credor.contato,
        passo: credor.passo,
        retorno: credor.retorno,
        obs: credor.obs,
      });
      setValorInput(credor.valor ? formatRjPlain(credor.valor) : "");
    } else {
      setForm(emptyForm());
      setValorInput("");
    }
  }, [open, credor]);

  const patch = (patch: Partial<RjCredorInput>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    if (!form.nome.trim()) return;
    const input: RjCredorInput = {
      ...form,
      nome: form.nome.trim(),
      valor: parseRjNum(valorInput),
      classe: form.sujeito ? (form.classe ?? "III") : null,
      motivo: form.sujeito ? null : (form.motivo ?? "fiduciaria"),
      contato: form.contato?.trim() ?? "",
      passo: form.passo?.trim() ?? "",
      obs: form.obs?.trim() ?? "",
      retorno: form.retorno || null,
    };
    await onSave(input, credor?.id);
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={credor ? "Editar credor" : "Cadastrar credor"}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="gold" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar credor"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-md border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
        <strong className="text-azul-profundo">Sujeito à RJ</strong> participa do condomínio e
        vota conforme a classe. <strong className="text-azul-profundo">Fora da RJ</strong> não
        vota (fiduciária, leasing, extraconcursal etc.).
      </div>

      <Field label="Nome do credor *">
        <input
          className={inputClass}
          value={form.nome}
          onChange={(e) => patch({ nome: e.target.value })}
          placeholder="Razão social ou nome"
        />
      </Field>

      <Field label="Situação">
        <select
          className={inputClass}
          value={form.sujeito ? "sim" : "nao"}
          onChange={(e) => {
            const sujeito = e.target.value === "sim";
            patch({
              sujeito,
              classe: sujeito ? form.classe ?? "III" : null,
              motivo: sujeito ? null : form.motivo ?? "fiduciaria",
            });
          }}
        >
          <option value="sim">Sujeito à RJ (vota)</option>
          <option value="nao">Fora da RJ (não vota)</option>
        </select>
      </Field>

      {form.sujeito ? (
        <Field label="Classe">
          <select
            className={inputClass}
            value={form.classe ?? "III"}
            onChange={(e) => patch({ classe: e.target.value as RjClasse })}
          >
            {RJ_CLASSE_VALUES.map((k) => (
              <option key={k} value={k}>
                {RJ_CLASSE_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Motivo (fora da RJ)">
          <select
            className={inputClass}
            value={form.motivo ?? "fiduciaria"}
            onChange={(e) => patch({ motivo: e.target.value as RjMotivo })}
          >
            {RJ_MOTIVO_VALUES.map((k) => (
              <option key={k} value={k}>
                {RJ_MOTIVO_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Valor do crédito (R$)">
        <input
          className={inputClass}
          inputMode="numeric"
          value={valorInput}
          onChange={(e) => setValorInput(e.target.value)}
          placeholder="0"
        />
      </Field>

      <Field label="Status">
        <select
          className={inputClass}
          value={form.status}
          onChange={(e) => patch({ status: e.target.value as RjStatus })}
        >
          {RJ_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {RJ_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Data de retorno">
        <input
          type="date"
          className={inputClass}
          value={form.retorno ?? ""}
          onChange={(e) => patch({ retorno: e.target.value || null })}
        />
      </Field>

      <Field label="Contato (pessoa / telefone)">
        <input
          className={inputClass}
          value={form.contato ?? ""}
          onChange={(e) => patch({ contato: e.target.value })}
          placeholder="ex.: João — (27) 9..."
        />
      </Field>

      <Field label="Próximo passo">
        <input
          className={inputClass}
          value={form.passo ?? ""}
          onChange={(e) => patch({ passo: e.target.value })}
          placeholder="ex.: Diretor retorna amanhã após falar com o jurídico"
        />
      </Field>

      <Field label="Observações">
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.obs ?? ""}
          onChange={(e) => patch({ obs: e.target.value })}
          placeholder="Histórico, condições, ressalvas..."
        />
      </Field>

      {credor?.id && <RjCredorReunioesSection credorId={credor.id} />}
    </SlideOver>
  );
}
