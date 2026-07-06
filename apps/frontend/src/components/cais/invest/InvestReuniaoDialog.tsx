import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
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
import { Button } from "@/components/cais/Button";
import { InvestFaixaTag } from "@/components/cais/invest/InvestFaixaTag";
import {
  INVEST_FAIXA_INFO,
  createInvestReuniao,
  fetchAssessoresParaFaixa,
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
  const [dataHora, setDataHora] = useState("");
  const [local, setLocal] = useState("");

  const assessores = useQuery({
    queryKey: ["invest-assessores", lead?.faixa ?? "none"],
    queryFn: () => fetchAssessoresParaFaixa(lead?.faixa ?? null),
    enabled: open && !!lead,
  });

  useEffect(() => {
    if (open) {
      setAssessorId(lead?.vendedor?.id ?? "");
      setDataHora("");
      setLocal("");
    }
  }, [open, lead]);

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
      <DialogContent className="max-w-md">
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
              Só aparecem assessores que atendem a faixa do lead (trava de faixa).
            </p>
          </div>

          <div>
            <Label htmlFor="reuniao-dh">Data e hora</Label>
            <Input
              id="reuniao-dh"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="mt-1.5"
            />
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

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Marcar reunião
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
