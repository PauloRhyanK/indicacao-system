import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
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

  const assessores = useQuery({
    queryKey: ["invest-assessores", lead?.faixa ?? "none"],
    queryFn: () => fetchAssessoresParaFaixa(lead?.faixa ?? null),
    enabled: open && !!lead,
  });

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;
  const slots = useQuery({
    queryKey: ["invest-assessor-slots", assessorId, dateStr],
    queryFn: () => fetchAssessorSlots(assessorId, dateStr!),
    enabled: open && !!assessorId && !!dateStr,
  });

  useEffect(() => {
    if (open) {
      setAssessorId(lead?.vendedor?.id ?? "");
      setDate(new Date());
      setDataHora("");
      setLocal("");
    }
  }, [open, lead]);

  // Se mudar de dia ou de assessor, limpa o horário selecionado
  useEffect(() => {
    setDataHora("");
  }, [dateStr, assessorId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error("Lead ausente");
      return createInvestReuniao({
        leadId: lead.id,
        assessorId,
        dataHoraInicio: dataHora,
        local: local.trim(),
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
                Apenas assessores com competência para a faixa do lead.
              </p>
            </div>

            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-500" /> Escolha o dia
              </Label>
              <div className="rounded-md border border-slate-200 p-1 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita: Horários e Local */}
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex-1">
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

            <div>
              <Label htmlFor="reuniao-local">Local / link (opcional)</Label>
              <Input
                id="reuniao-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="ex.: escritório / videochamada"
                className="mt-1.5"
              />
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
