import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Loader2, Calendar as CalendarIcon, Clock, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/cais/Button";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import {
  INVEST_FAIXA_INFO,
  createInvestReuniao,
  fetchAssessoresParaFaixa,
  fetchAssessorSlots,
  type InvestLead,
} from "@/lib/invest-api";

const DURATION_STEP_MIN = 30;
const DURATION_MIN_MIN = 30;
const DURATION_MAX_MIN = 240;

function formatDuration(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

interface InvestReuniaoDialogProps {
  open: boolean;
  onClose: () => void;
  lead: InvestLead | null;
}

/** Marca uma reunião para o lead, restringindo assessores compatíveis com a faixa. */
export function InvestReuniaoDialog({ open, onClose, lead }: InvestReuniaoDialogProps) {
  const queryClient = useQueryClient();
  const [assessorId, setAssessorId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dataHora, setDataHora] = useState("");
  const [local, setLocal] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [participanteIds, setParticipanteIds] = useState<string[]>([]);

  const assessores = useQuery({
    queryKey: ["invest-assessores", lead?.faixa ?? "none"],
    queryFn: () => fetchAssessoresParaFaixa(lead?.faixa ?? null),
    enabled: open && !!lead,
  });

  // Lista completa de colegas para convidar como participantes (não restrita à faixa do lead).
  const colegas = useQuery({
    queryKey: ["invest-assessores", "todos"],
    queryFn: () => fetchAssessoresParaFaixa(null),
    enabled: open,
  });

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;
  const slots = useQuery({
    queryKey: ["invest-assessor-slots", assessorId, dateStr, duracaoMinutos],
    queryFn: () => fetchAssessorSlots(assessorId, dateStr!, duracaoMinutos),
    enabled: open && !!assessorId && !!dateStr,
  });

  useEffect(() => {
    if (open) {
      setAssessorId(lead?.vendedor?.id ?? "");
      setDate(new Date());
      setDataHora("");
      setLocal("");
      setIsOnline(false);
      setDuracaoMinutos(60);
      setParticipanteIds([]);
    }
  }, [open, lead]);

  // Se mudar de dia, assessor ou duração, limpa o horário selecionado
  useEffect(() => {
    setDataHora("");
  }, [dateStr, assessorId, duracaoMinutos]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error("Lead ausente");
      const inicio = new Date(dataHora);
      const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000);
      return createInvestReuniao({
        leadId: lead.id,
        assessorId,
        dataHoraInicio: dataHora,
        dataHoraFim: fim.toISOString(),
        local: local.trim(),
        isOnline,
        participanteIds,
      });
    },
    onSuccess: () => {
      toast.success("Reunião marcada");
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
      queryClient.invalidateQueries({ queryKey: ["invest-reunioes"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const faixaInfo = lead?.faixa ? INVEST_FAIXA_INFO[lead.faixa] : null;
  const canSave = !!assessorId && !!dataHora && !mutation.isPending;

  function toggleParticipante(id: string) {
    setParticipanteIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-ouro-escuro" /> Marcar reunião
          </DialogTitle>
          <DialogDescription>
            {lead ? (
              <span className="flex items-center gap-1.5">
                {lead.nome} <InvestFaixaTag faixa={lead.faixa} />
              </span>
            ) : (
              "—"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Coluna Esquerda: Assessor e Calendário */}
          <div className="space-y-4">
            <div>
              <Label>
                Assessor {faixaInfo ? `compatível com ${faixaInfo.label}` : ""}
              </Label>
              <Select value={assessorId} onValueChange={setAssessorId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Escolha o assessor" />
                </SelectTrigger>
                <SelectContent>
                  {(assessores.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-slate-500">
                Apenas assessores configurados para a faixa do lead.
              </p>
            </div>

            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-500" /> Escolha o dia
              </Label>
              <div className="rounded-md border border-slate-200 p-1 flex justify-center">
                <Calendar
                  mode="single"
                  required
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Duração</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDuracaoMinutos((d) => Math.max(DURATION_MIN_MIN, d - DURATION_STEP_MIN))
                  }
                  disabled={duracaoMinutos <= DURATION_MIN_MIN}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-16 text-center text-sm font-medium text-azul-profundo">
                  {formatDuration(duracaoMinutos)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDuracaoMinutos((d) => Math.min(DURATION_MAX_MIN, d + DURATION_STEP_MIN))
                  }
                  disabled={duracaoMinutos >= DURATION_MAX_MIN}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="reuniao-local" className="flex items-baseline gap-1">
                Local <span className="text-slate-400 font-normal text-[11px]">(opcional)</span>
              </Label>
              <Input
                id="reuniao-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="ex.: escritório / videochamada"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Coluna Direita: Horários e participantes */}
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" /> Horários livres
              </Label>

              {!assessorId ? (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                  Selecione um assessor primeiro.
                </div>
              ) : !date ? (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                  Selecione um dia no calendário.
                </div>
              ) : slots.isLoading ? (
                <div className="flex items-center justify-center p-8 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (slots.data ?? []).length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-600">Sem horários</p>
                  <p className="text-[11px] text-slate-400 mt-1">O assessor não possui horários livres neste dia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2 pb-2">
                  {slots.data!.map((slot) => {
                    const timeLabel = format(new Date(slot), "HH:mm");
                    const isSelected = dataHora === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setDataHora(slot)}
                        className={`rounded-md border py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-azul-profundo bg-azul-profundo text-branco"
                            : "border-slate-200 bg-branco text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOnlineCheckbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="rounded border-slate-300 text-ouro-escuro focus:ring-ouro-escuro"
                />
                <Label htmlFor="isOnlineCheckbox" className="font-normal text-slate-700 cursor-pointer">
                  Gerar link do Microsoft Teams
                </Label>
              </div>

              <div>
                <Label className="mb-1.5 block flex items-baseline gap-1">
                  Outros participantes{" "}
                  <span className="text-slate-400 font-normal text-[11px]">(opcional)</span>
                </Label>
                <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                  {(colegas.data ?? [])
                    .filter((c) => c.id !== assessorId)
                    .map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={participanteIds.includes(c.id)}
                          onCheckedChange={() => toggleParticipante(c.id)}
                        />
                        {c.name}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
