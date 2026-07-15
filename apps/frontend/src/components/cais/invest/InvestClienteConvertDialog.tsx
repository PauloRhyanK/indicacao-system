import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/cais/Button";
import type { Profile } from "@/lib/cais-api";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  buildClienteConvertDefaults,
  convertInvestCliente,
  faixaFromPl,
  type ConvertInvestClientePayload,
  type InvestCliente,
} from "@/lib/invest-api";

const NONE = "__none__";

interface InvestClienteConvertDialogProps {
  open: boolean;
  onClose: () => void;
  cliente: InvestCliente | null;
  profiles: Profile[];
}

export function InvestClienteConvertDialog({
  open,
  onClose,
  cliente,
  profiles,
}: InvestClienteConvertDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConvertInvestClientePayload | null>(null);
  const [responsavelId, setResponsavelId] = useState<string>(NONE);
  const [successLeadId, setSuccessLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (cliente && open) {
      const defaults = buildClienteConvertDefaults(cliente);
      setForm(defaults);
      setResponsavelId(NONE);
      setSuccessLeadId(null);
    }
  }, [cliente, open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!cliente || !form) throw new Error("Dados incompletos");
      const respId = responsavelId !== NONE ? responsavelId : null;
      const profile = profiles.find((p) => p.id === respId);
      return convertInvestCliente(cliente.id, {
        ...form,
        origem: "btg",
        responsavelId: respId,
        responsavelNome: profile?.name ?? form.responsavelNome ?? "",
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invest-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["invest-leads"] });
      if (result.alreadyConverted) {
        toast.info(result.message);
        setSuccessLeadId(result.lead.id);
      } else {
        toast.success(result.message);
        setSuccessLeadId(result.lead.id);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = () => {
    setForm(null);
    setSuccessLeadId(null);
    onClose();
  };

  if (!cliente || !form) return null;

  const plNum = form.pl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transformar em lead — Fila SDR</DialogTitle>
          <DialogDescription>
            Revise os dados de <strong>{cliente.nome}</strong> (conta {cliente.conta}) antes de
            enviar para a fila SDR. O lead será auto-qualificado.
          </DialogDescription>
        </DialogHeader>

        {successLeadId ? (
          <div className="space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              Cliente convertido em lead. Ele já aparece na Fila SDR com tag <strong>Base BTG</strong>.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Fechar
              </Button>
              <Link to="/investimentos/sdr">
                <Button>Ir para Fila SDR</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>PL (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.pl || ""}
                  onChange={(e) => {
                    const pl = Number(e.target.value) || 0;
                    setForm({
                      ...form,
                      pl,
                      faixa: faixaFromPl(pl),
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Faixa</Label>
                <Select
                  value={form.faixa ?? faixaFromPl(plNum)}
                  onValueChange={(v) => setForm({ ...form, faixa: v as typeof form.faixa })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVEST_FAIXAS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {INVEST_FAIXA_INFO[f].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contato (e-mail)</Label>
                <Input
                  value={form.contato}
                  onChange={(e) => setForm({ ...form, contato: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Celular</Label>
                <Input
                  value={form.celular ?? ""}
                  onChange={(e) => setForm({ ...form, celular: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Responsável</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.responsavelNome && (
                  <p className="text-xs text-muted-foreground">
                    Referência da planilha: {form.responsavelNome}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Retorno</Label>
                <Input
                  type="date"
                  value={form.retorno ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, retorno: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Próximo passo</Label>
                <Input
                  value={form.passo}
                  onChange={(e) => setForm({ ...form, passo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={form.obs}
                  onChange={(e) => setForm({ ...form, obs: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                disabled={
                  !form.nome.trim() ||
                  responsavelId === NONE ||
                  mutation.isPending
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar para SDR
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
