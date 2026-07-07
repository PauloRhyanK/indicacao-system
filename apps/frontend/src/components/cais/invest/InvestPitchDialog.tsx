import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Phone, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/cais/Button";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  createInvestPitch,
  deleteInvestPitch,
  emptyPitchConteudo,
  updateInvestPitch,
  type InvestFaixa,
  type InvestPitch,
  type InvestPitchConteudo,
  type InvestPitchObjecao,
  type InvestPitchPayload,
} from "@/lib/invest-api";

interface InvestPitchDialogProps {
  open: boolean;
  onClose: () => void;
  pitch: InvestPitch | null;
  canManage: boolean;
}

interface FormState {
  faixa: InvestFaixa;
  titulo: string;
  gancho: string;
  padraoDoSegmento: boolean;
  ativo: boolean;
  conteudo: InvestPitchConteudo;
}

function emptyForm(): FormState {
  return {
    faixa: "pj",
    titulo: "",
    gancho: "",
    padraoDoSegmento: false,
    ativo: true,
    conteudo: emptyPitchConteudo(),
  };
}

function formFromPitch(p: InvestPitch): FormState {
  return {
    faixa: p.faixa,
    titulo: p.titulo,
    gancho: p.gancho,
    padraoDoSegmento: p.padrao_do_segmento,
    ativo: p.ativo,
    // Garante todas as seções mesmo se o registro vier incompleto.
    conteudo: { ...emptyPitchConteudo(), ...p.conteudo, sdr: { ...emptyPitchConteudo().sdr, ...p.conteudo.sdr }, assessor: { ...emptyPitchConteudo().assessor, ...p.conteudo.assessor } },
  };
}

/** Editor de lista de strings (bullets). */
function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-slate-500">{label}</Label>
      <div className="mt-1.5 space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Textarea
              value={it}
              onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[38px] flex-1 text-[13px]"
              rows={1}
            />
            <Button
              variant="ghost"
              className="h-8 px-2 text-slate-400 hover:text-red-600"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              disabled={disabled}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          className="text-[12px] text-slate-500"
          onClick={() => onChange([...items, ""])}
          disabled={disabled}
          type="button"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar item
        </Button>
      </div>
    </div>
  );
}

/** Editor de objeções (par pergunta → resposta). */
function ObjecaoListEditor({
  label,
  items,
  onChange,
  disabled,
}: {
  label: string;
  items: InvestPitchObjecao[];
  onChange: (next: InvestPitchObjecao[]) => void;
  disabled?: boolean;
}) {
  const set = (i: number, key: keyof InvestPitchObjecao, value: string) =>
    onChange(items.map((o, j) => (j === i ? { ...o, [key]: value } : o)));
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-slate-500">{label}</Label>
      <div className="mt-1.5 space-y-2">
        {items.map((o, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">Objeção {i + 1}</span>
              <Button
                variant="ghost"
                className="h-6 px-1.5 text-slate-400 hover:text-red-600"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                disabled={disabled}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              value={o.q}
              onChange={(e) => set(i, "q", e.target.value)}
              placeholder="O que o cliente diz…"
              disabled={disabled}
              className="mb-1.5 text-[13px]"
            />
            <Textarea
              value={o.a}
              onChange={(e) => set(i, "a", e.target.value)}
              placeholder="→ Como contornar…"
              disabled={disabled}
              className="min-h-[44px] text-[13px]"
            />
          </div>
        ))}
        <Button
          variant="ghost"
          className="text-[12px] text-slate-500"
          onClick={() => onChange([...items, { q: "", a: "" }])}
          disabled={disabled}
          type="button"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar objeção
        </Button>
      </div>
    </div>
  );
}

function StageTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-slate-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-azul-profundo">
      {icon}
      {children}
    </h3>
  );
}

export function InvestPitchDialog({ open, onClose, pitch, canManage }: InvestPitchDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(pitch ? formFromPitch(pitch) : emptyForm());
      setConfirmDelete(false);
    }
  }, [open, pitch]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invest-pitches"] });

  const setSdr = <K extends keyof InvestPitchConteudo["sdr"]>(
    key: K,
    value: InvestPitchConteudo["sdr"][K],
  ) => setForm((f) => ({ ...f, conteudo: { ...f.conteudo, sdr: { ...f.conteudo.sdr, [key]: value } } }));

  const setAssessor = <K extends keyof InvestPitchConteudo["assessor"]>(
    key: K,
    value: InvestPitchConteudo["assessor"][K],
  ) =>
    setForm((f) => ({
      ...f,
      conteudo: { ...f.conteudo, assessor: { ...f.conteudo.assessor, [key]: value } },
    }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: InvestPitchPayload = {
        faixa: form.faixa,
        titulo: form.titulo.trim(),
        gancho: form.gancho.trim(),
        padraoDoSegmento: form.padraoDoSegmento,
        ativo: form.ativo,
        conteudo: form.conteudo,
      };
      return pitch ? updateInvestPitch(pitch.id, payload) : createInvestPitch(payload);
    },
    onSuccess: () => {
      toast.success(pitch ? "Pitch atualizado" : "Pitch criado");
      invalidate();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (pitch) await deleteInvestPitch(pitch.id);
    },
    onSuccess: () => {
      toast.success("Pitch excluído");
      invalidate();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = saveMutation.isPending || deleteMutation.isPending;
  const disabled = !canManage;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[94vh] w-full max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="hidden">
          <DialogTitle>{pitch ? "Editar pitch" : "Novo pitch"}</DialogTitle>
          <DialogDescription>Formulário de pitch comercial</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center border-b border-slate-100 py-2.5 pl-5 pr-9">
          <h2 className="text-[15px] font-semibold text-azul-profundo">
            {pitch ? "Editar pitch" : "Novo pitch"}
          </h2>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Identificação */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]">
            <div>
              <Label>Segmento (faixa)</Label>
              <Select
                value={form.faixa}
                onValueChange={(v) => setForm((f) => ({ ...f, faixa: v as InvestFaixa }))}
                disabled={disabled}
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
            </div>
            <div>
              <Label htmlFor="pitch-titulo">Título</Label>
              <Input
                id="pitch-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="ex.: Caixa que Trabalha — Tesouraria PJ"
                disabled={disabled}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pitch-gancho">Gancho (hook de abertura)</Label>
            <Textarea
              id="pitch-gancho"
              value={form.gancho}
              onChange={(e) => setForm((f) => ({ ...f, gancho: e.target.value }))}
              placeholder="A frase de impacto que abre a conversa"
              disabled={disabled}
              className="mt-1.5 min-h-[56px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <Switch
                checked={form.padraoDoSegmento}
                onCheckedChange={(v) => setForm((f) => ({ ...f, padraoDoSegmento: v }))}
                disabled={disabled}
              />
              Padrão do segmento (★)
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                disabled={disabled}
              />
              Ativo
            </label>
          </div>

          {/* Etapa 1 — SDR */}
          <div className="space-y-4 rounded-lg border border-slate-100 p-4">
            <StageTitle icon={<Phone className="h-4 w-4" />}>Etapa 1 — SDR (marcar a reunião)</StageTitle>
            <div>
              <Label>Missão do SDR</Label>
              <Input
                value={form.conteudo.sdr.missao}
                onChange={(e) => setSdr("missao", e.target.value)}
                placeholder="Objetivo único da ligação"
                disabled={disabled}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Abertura da ligação (script)</Label>
              <Textarea
                value={form.conteudo.sdr.aberturaLigacao}
                onChange={(e) => setSdr("aberturaLigacao", e.target.value)}
                disabled={disabled}
                className="mt-1.5 min-h-[70px]"
              />
            </div>
            <StringListEditor
              label="Qualificação rápida"
              items={form.conteudo.sdr.qualificacao}
              onChange={(v) => setSdr("qualificacao", v)}
              placeholder="Pergunta de qualificação"
              disabled={disabled}
            />
            <ObjecaoListEditor
              label="Objeções de telefone"
              items={form.conteudo.sdr.objecoes}
              onChange={(v) => setSdr("objecoes", v)}
              disabled={disabled}
            />
            <div>
              <Label>Fechamento da agenda (script)</Label>
              <Textarea
                value={form.conteudo.sdr.fechamentoAgenda}
                onChange={(e) => setSdr("fechamentoAgenda", e.target.value)}
                disabled={disabled}
                className="mt-1.5 min-h-[56px]"
              />
            </div>
          </div>

          {/* Etapa 2 — Assessor */}
          <div className="space-y-4 rounded-lg border border-slate-100 p-4">
            <StageTitle icon={<Users className="h-4 w-4" />}>
              Etapa 2 — Assessor (conduzir a reunião)
            </StageTitle>
            <StringListEditor
              label="Preparação (antes da reunião)"
              items={form.conteudo.assessor.preparacao}
              onChange={(v) => setAssessor("preparacao", v)}
              disabled={disabled}
            />
            <div>
              <Label>Abertura da reunião (script)</Label>
              <Textarea
                value={form.conteudo.assessor.aberturaReuniao}
                onChange={(e) => setAssessor("aberturaReuniao", e.target.value)}
                disabled={disabled}
                className="mt-1.5 min-h-[56px]"
              />
            </div>
            <StringListEditor
              label="Descoberta"
              items={form.conteudo.assessor.descoberta}
              onChange={(v) => setAssessor("descoberta", v)}
              disabled={disabled}
            />
            <div>
              <Label>Racional da apresentação</Label>
              <Textarea
                value={form.conteudo.assessor.racional}
                onChange={(e) => setAssessor("racional", e.target.value)}
                disabled={disabled}
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <StringListEditor
              label="Arsenal BTG + CAIS"
              items={form.conteudo.assessor.arsenal}
              onChange={(v) => setAssessor("arsenal", v)}
              disabled={disabled}
            />
            <ObjecaoListEditor
              label="Objeções da reunião"
              items={form.conteudo.assessor.objecoes}
              onChange={(v) => setAssessor("objecoes", v)}
              disabled={disabled}
            />
            <div>
              <Label>Próximo passo (fechamento)</Label>
              <Textarea
                value={form.conteudo.assessor.proximoPasso}
                onChange={(e) => setAssessor("proximoPasso", e.target.value)}
                disabled={disabled}
                className="mt-1.5 min-h-[56px]"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-4">
          <div>
            {pitch && canManage &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Excluir este pitch?</span>
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
              {canManage ? "Cancelar" : "Fechar"}
            </Button>
            {canManage && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={busy || !form.titulo.trim()}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar pitch
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
