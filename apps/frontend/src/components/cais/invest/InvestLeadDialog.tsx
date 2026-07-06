import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
  INVEST_ETAPAS,
  INVEST_ETAPA_INFO,
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  INVEST_ORIGENS,
  INVEST_PL_FLOOR,
  INVEST_PRODUTOS,
  createInvestLead,
  deleteInvestLead,
  faixaFromPl,
  updateInvestLead,
  type InvestEtapa,
  type InvestFaixa,
  type InvestLead,
  type InvestLeadPayload,
} from "@/lib/invest-api";

const NONE = "__none__";

interface InvestLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead: InvestLead | null;
  profiles: Profile[];
  canManage: boolean;
}

interface FormState {
  nome: string;
  origem: string;
  produto: string;
  pitch: string;
  pl: string;
  etapa: InvestEtapa;
  probabilidade: string;
  faixa: InvestFaixa;
  indicadoPor: string;
  celular: string;
  responsavelId: string;
  vendedorId: string;
  coVendedorId: string;
  contato: string;
  passo: string;
  retorno: string;
  obs: string;
}

function emptyForm(): FormState {
  return {
    nome: "",
    origem: "indicacao",
    produto: "carteira",
    pitch: "",
    pl: "",
    etapa: "lead",
    probabilidade: String(INVEST_ETAPA_INFO.lead.prob),
    faixa: "digital",
    indicadoPor: "",
    celular: "",
    responsavelId: NONE,
    vendedorId: NONE,
    coVendedorId: NONE,
    contato: "",
    passo: "",
    retorno: "",
    obs: "",
  };
}

function formFromLead(lead: InvestLead): FormState {
  return {
    nome: lead.nome,
    origem: lead.origem,
    produto: lead.produto,
    pitch: lead.pitch,
    pl: lead.pl ? String(lead.pl) : "",
    etapa: lead.etapa,
    probabilidade: String(lead.probabilidade),
    faixa: lead.faixa ?? faixaFromPl(lead.pl),
    indicadoPor: lead.indicado_por,
    celular: lead.celular,
    responsavelId: lead.responsavel?.id ?? NONE,
    vendedorId: lead.vendedor?.id ?? NONE,
    coVendedorId: lead.co_vendedor?.id ?? NONE,
    contato: lead.contato,
    passo: lead.passo,
    retorno: lead.retorno ?? "",
    obs: lead.obs,
  };
}

function parsePl(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function InvestLeadDialog({
  open,
  onClose,
  lead,
  profiles,
  canManage,
}: InvestLeadDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Faixa acompanha o PL até o usuário escolher manualmente.
  const [faixaTouched, setFaixaTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(lead ? formFromLead(lead) : emptyForm());
      setConfirmDelete(false);
      setFaixaTouched(Boolean(lead?.faixa));
    }
  }, [open, lead]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onPlChange = (value: string) => {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const plNum = parseFloat(cleaned);
    setForm((f) => ({
      ...f,
      pl: value,
      faixa: faixaTouched ? f.faixa : faixaFromPl(Number.isFinite(plNum) ? plNum : 0),
    }));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invest-leads"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: InvestLeadPayload = {
        nome: form.nome.trim(),
        origem: form.origem,
        produto: form.produto,
        pitch: form.pitch.trim(),
        pl: parsePl(form.pl),
        etapa: form.etapa,
        probabilidade: Math.max(0, Math.min(100, parseInt(form.probabilidade, 10) || 0)),
        faixa: form.faixa,
        responsavelId: form.responsavelId === NONE ? null : form.responsavelId,
        vendedorId: form.vendedorId === NONE ? null : form.vendedorId,
        coVendedorId: form.coVendedorId === NONE ? null : form.coVendedorId,
        indicadoPor: form.indicadoPor.trim(),
        celular: form.celular.trim(),
        contato: form.contato.trim(),
        passo: form.passo.trim(),
        retorno: form.retorno || null,
        obs: form.obs.trim(),
      };
      return lead ? updateInvestLead(lead.id, payload) : createInvestLead(payload);
    },
    onSuccess: () => {
      toast.success(lead ? "Lead atualizado" : "Lead cadastrado");
      invalidate();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (lead) await deleteInvestLead(lead.id);
    },
    onSuccess: () => {
      toast.success("Lead excluído do pipeline");
      invalidate();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = saveMutation.isPending || deleteMutation.isPending;
  const plParsed = parsePl(form.pl);
  const plBelowFloor = plParsed > 0 && plParsed < INVEST_PL_FLOOR;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Cadastrar lead"}</DialogTitle>
          <DialogDescription>
            Preencha o que tiver — PL e produto podem ser completados depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="inv-nome">Nome do lead / cliente</Label>
            <Input
              id="inv-nome"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="ex.: Construtora Vale Verde"
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Origem</Label>
            <Select value={form.origem} onValueChange={(v) => set("origem", v)} disabled={!canManage}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVEST_ORIGENS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Produto de interesse</Label>
            <Select value={form.produto} onValueChange={(v) => set("produto", v)} disabled={!canManage}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVEST_PRODUTOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Etapa do funil</Label>
            <Select
              value={form.etapa}
              onValueChange={(v) => set("etapa", v as InvestEtapa)}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVEST_ETAPAS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {INVEST_ETAPA_INFO[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="inv-prob">Probabilidade (%)</Label>
            <Input
              id="inv-prob"
              type="number"
              min={0}
              max={100}
              step={5}
              value={form.probabilidade}
              onChange={(e) => set("probabilidade", e.target.value)}
              disabled={!canManage}
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-slate-500">Manual por lead — defina a chance real.</p>
          </div>

          <div>
            <Label htmlFor="inv-pl">PL estimado (R$)</Label>
            <Input
              id="inv-pl"
              inputMode="numeric"
              value={form.pl}
              onChange={(e) => onPlChange(e.target.value)}
              placeholder="0,00"
              disabled={!canManage}
              className="mt-1.5"
            />
            {plBelowFloor && (
              <p className="mt-1 text-[11px] text-amber-600">
                Abaixo de R$ 1 mi — fora do piso da campanha (entra sinalizado).
              </p>
            )}
          </div>

          <div>
            <Label>Faixa</Label>
            <Select
              value={form.faixa}
              onValueChange={(v) => {
                setFaixaTouched(true);
                set("faixa", v as InvestFaixa);
              }}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1.5">
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
            <p className="mt-1 text-[11px] text-slate-500">
              Sugerida pelo PL — reclassificável a qualquer momento.
            </p>
          </div>

          <div>
            <Label htmlFor="inv-celular">Celular</Label>
            <Input
              id="inv-celular"
              value={form.celular}
              onChange={(e) => set("celular", e.target.value)}
              placeholder="(27) 9...."
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="inv-indicado">Indicado por</Label>
            <Input
              id="inv-indicado"
              value={form.indicadoPor}
              onChange={(e) => set("indicadoPor", e.target.value)}
              placeholder="quem trouxe o lead"
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Responsável</Label>
            <Select
              value={form.responsavelId}
              onValueChange={(v) => set("responsavelId", v)}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem responsável</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lead && !lead.responsavel && lead.responsavel_nome ? (
              <p className="mt-1 text-[11px] text-slate-500">
                Na planilha: <strong>{lead.responsavel_nome}</strong> (não mapeado a um usuário)
              </p>
            ) : null}
          </div>

          <div>
            <Label>Vendedor / Assessor</Label>
            <Select
              value={form.vendedorId}
              onValueChange={(v) => set("vendedorId", v)}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Quem atende / fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— (pode ser o responsável)</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Co-vendedor</Label>
            <Select
              value={form.coVendedorId}
              onValueChange={(v) => set("coVendedorId", v)}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sem co-vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem co-vendedor</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="inv-contato">Contato (pessoa / telefone)</Label>
            <Input
              id="inv-contato"
              value={form.contato}
              onChange={(e) => set("contato", e.target.value)}
              placeholder="ex.: Sr. Antônio — (27) 9..."
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="inv-retorno">Data de retorno</Label>
            <Input
              id="inv-retorno"
              type="date"
              value={form.retorno}
              onChange={(e) => set("retorno", e.target.value)}
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="inv-passo">Próximo passo</Label>
            <Input
              id="inv-passo"
              value={form.passo}
              onChange={(e) => set("passo", e.target.value)}
              placeholder="ex.: Reunião de diagnóstico patrimonial na quinta"
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="inv-pitch">Pitch</Label>
            <Input
              id="inv-pitch"
              value={form.pitch}
              onChange={(e) => set("pitch", e.target.value)}
              placeholder="ex.: gestão conta PJ, análise da carteira, Fundo Fortlev..."
              disabled={!canManage}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="inv-obs">Observações</Label>
            <Textarea
              id="inv-obs"
              value={form.obs}
              onChange={(e) => set("obs", e.target.value)}
              placeholder="Perfil, objetivos, concorrência, ressalvas..."
              disabled={!canManage}
              className="mt-1.5 min-h-[64px]"
            />
          </div>
        </div>

        {canManage && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              {lead &&
                (confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Excluir este lead?</span>
                    <Button
                      variant="ghost"
                     
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate()}
                      disabled={busy}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirmar"
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                   
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={busy || !form.nome.trim()}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar lead
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
