import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/cais/Button";
import { Field, SlideOver, inputClass } from "@/components/cais/SlideOver";
import {
  fetchRjCredores,
  fetchRjReuniaoParticipantesOpcoes,
  type RjReuniao,
  type RjReuniaoInput,
  type RjReuniaoUpdateInput,
} from "@/lib/cais-api";
import {
  addMinutesToTime,
  dateTimePartsToIso,
  defaultReuniaoStartParts,
  splitIsoDateTime,
} from "@/lib/rj-format";

interface FormState {
  credorId: string;
  titulo: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  local: string;
  linkOnline: string;
  pauta: string;
  participantesIds: string[];
}

const emptyForm = (): FormState => ({
  credorId: "",
  titulo: "",
  dataInicio: "",
  horaInicio: "",
  dataFim: "",
  horaFim: "",
  local: "",
  linkOnline: "",
  pauta: "",
  participantesIds: [],
});

function newMeetingDefaults(): Pick<FormState, "dataInicio" | "horaInicio" | "dataFim" | "horaFim"> {
  const start = defaultReuniaoStartParts();
  return {
    dataInicio: start.date,
    horaInicio: start.time,
    dataFim: start.date,
    horaFim: addMinutesToTime(start.time, 60),
  };
}

export function RjReuniaoDrawer({
  open,
  reuniao,
  fixedCredorId,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  reuniao: RjReuniao | null;
  fixedCredorId?: string;
  onClose: () => void;
  onSave: (input: RjReuniaoInput | RjReuniaoUpdateInput, id?: string) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const credoresQuery = useQuery({
    queryKey: ["rj-credores"],
    queryFn: fetchRjCredores,
    enabled: open,
  });

  const participantesQuery = useQuery({
    queryKey: ["rj-reuniao-participantes"],
    queryFn: fetchRjReuniaoParticipantesOpcoes,
    enabled: open,
  });

  const participantesOpcoes = participantesQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (reuniao) {
      const inicio = splitIsoDateTime(reuniao.dataHoraInicio);
      const fim = splitIsoDateTime(reuniao.dataHoraFim);
      setForm({
        credorId: reuniao.credorId,
        titulo: reuniao.titulo,
        dataInicio: inicio.date,
        horaInicio: inicio.time,
        dataFim: fim.date,
        horaFim: fim.time,
        local: reuniao.local ?? "",
        linkOnline: reuniao.linkOnline ?? "",
        pauta: reuniao.pauta ?? "",
        participantesIds: reuniao.participantes.map((p) => p.userId),
      });
    } else {
      setForm({ ...emptyForm(), credorId: fixedCredorId ?? "", ...newMeetingDefaults() });
    }
  }, [open, reuniao, fixedCredorId]);

  useEffect(() => {
    if (!open || reuniao) return;
    if (participantesOpcoes.length === 0) return;
    setForm((f) =>
      f.participantesIds.length > 0
        ? f
        : { ...f, participantesIds: participantesOpcoes.map((p) => p.id) },
    );
  }, [open, reuniao, participantesOpcoes]);

  const credores = useMemo(
    () =>
      [...(credoresQuery.data?.credores ?? [])].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    [credoresQuery.data],
  );

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const setInicio = (dataInicio: string, horaInicio: string) => {
    setForm((f) => {
      const next = { ...f, dataInicio, horaInicio };
      if (!f.dataFim || f.dataFim === f.dataInicio) {
        next.dataFim = dataInicio;
      }
      if (!f.horaFim || (f.dataFim === f.dataInicio && f.horaInicio === horaInicio)) {
        next.horaFim = addMinutesToTime(horaInicio, 60);
      }
      return next;
    });
  };

  const toggleParticipante = (id: string) => {
    setForm((f) => ({
      ...f,
      participantesIds: f.participantesIds.includes(id)
        ? f.participantesIds.filter((x) => x !== id)
        : [...f.participantesIds, id],
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.credorId) {
      setError("Selecione o credor.");
      return;
    }
    if (!form.dataInicio || !form.horaInicio) {
      setError("Informe a data e o horário de início.");
      return;
    }

    const dataHoraInicio = dateTimePartsToIso(form.dataInicio, form.horaInicio);
    const hasFim = Boolean(form.dataFim && form.horaFim);
    const dataHoraFim = hasFim
      ? dateTimePartsToIso(form.dataFim, form.horaFim)
      : null;

    if (dataHoraFim && new Date(dataHoraFim) <= new Date(dataHoraInicio)) {
      setError("O término deve ser depois do início.");
      return;
    }

    const base = {
      credorId: form.credorId,
      titulo: form.titulo.trim() || undefined,
      dataHoraInicio,
      dataHoraFim,
      local: form.local.trim() || null,
      linkOnline: form.linkOnline.trim() || null,
      pauta: form.pauta.trim() || null,
      participantesIds: form.participantesIds,
    } satisfies RjReuniaoInput;

    await onSave(base, reuniao?.id);
  };

  const footer = (
    <div className="flex gap-2">
      <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
        Cancelar
      </Button>
      <Button
        variant="gold"
        className="flex-1"
        onClick={() => void handleSubmit()}
        disabled={saving}
      >
        {saving ? "Salvando…" : reuniao ? "Salvar alterações" : "Agendar reunião"}
      </Button>
    </div>
  );

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={reuniao ? "Editar reunião" : "Agendar reunião"}
      footer={footer}
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
          {error}
        </div>
      )}

      <Field label="Credor">
        <select
          className={inputClass}
          value={form.credorId}
          disabled={Boolean(fixedCredorId) || credoresQuery.isLoading}
          onChange={(e) => {
            const credor = credores.find((c) => c.id === e.target.value);
            patch({
              credorId: e.target.value,
              titulo: form.titulo || (credor ? `Reunião — ${credor.nome}` : ""),
            });
          }}
        >
          <option value="">Selecione…</option>
          {credores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Título">
        <input
          className={inputClass}
          value={form.titulo}
          placeholder="Reunião — nome do credor"
          onChange={(e) => patch({ titulo: e.target.value })}
        />
      </Field>

      <div className="mb-4 rounded-md border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-3 text-[12px] font-medium text-slate-700">Início</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-500">Data</span>
            <input
              type="date"
              className={inputClass}
              value={form.dataInicio}
              onChange={(e) => setInicio(e.target.value, form.horaInicio)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-500">Horário</span>
            <input
              type="time"
              step={900}
              className={inputClass}
              value={form.horaInicio}
              onChange={(e) => setInicio(form.dataInicio, e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-slate-200 p-3">
        <p className="mb-1 text-[12px] font-medium text-slate-700">Término</p>
        <p className="mb-3 text-[11px] text-slate-500">
          Opcional — se vazio, assume 1 hora após o início.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-500">Data</span>
            <input
              type="date"
              className={inputClass}
              value={form.dataFim}
              onChange={(e) => patch({ dataFim: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-500">Horário</span>
            <input
              type="time"
              step={900}
              className={inputClass}
              value={form.horaFim}
              onChange={(e) => patch({ horaFim: e.target.value })}
            />
          </label>
        </div>
      </div>

      <Field label="Local">
        <input
          className={inputClass}
          value={form.local}
          placeholder="Google Meet, escritório, ligação…"
          onChange={(e) => patch({ local: e.target.value })}
        />
      </Field>

      <Field label="Link da chamada">
        <input
          className={inputClass}
          value={form.linkOnline}
          placeholder="https://meet.google.com/…"
          onChange={(e) => patch({ linkOnline: e.target.value })}
        />
      </Field>

      <Field label="Pauta">
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.pauta}
          onChange={(e) => patch({ pauta: e.target.value })}
        />
      </Field>

      <div className="mb-2">
        <span className="mb-1.5 block text-[12px] font-medium text-slate-700">
          Participantes internos
        </span>
        <p className="mb-2 text-[11px] text-slate-500">
          Por padrão, todos os usuários com acesso à agenda são convidados. Remova quem não deve
          participar.
        </p>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
          {participantesQuery.isLoading && (
            <p className="px-1 text-[12px] text-slate-400">Carregando…</p>
          )}
          {participantesOpcoes.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={form.participantesIds.includes(p.id)}
                onChange={() => toggleParticipante(p.id)}
              />
              <span className="text-azul-profundo">{p.nome}</span>
              <span className="text-slate-400">{p.email}</span>
            </label>
          ))}
          {!participantesQuery.isLoading && participantesOpcoes.length === 0 && (
            <p className="px-1 text-[12px] text-slate-400">Nenhum usuário com acesso à agenda.</p>
          )}
        </div>
      </div>
    </SlideOver>
  );
}
