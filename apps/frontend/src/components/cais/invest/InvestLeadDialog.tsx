import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Compass, Loader2, Trash2, CalendarClock, Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

/** Ícone (i) com dica em tooltip — substitui os textos de ajuda fixos abaixo dos campos. */
function FieldHint({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex items-center align-middle text-slate-400 hover:text-slate-600"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px]">{children}</TooltipContent>
    </Tooltip>
  );
}

/** Label com hint opcional embutido — evita repetir o wrapper flex em todo campo. */
function LabelWithHint({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

interface InvestLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead: InvestLead | null;
  profiles: Profile[];
  canManage: boolean;
  /** Captação: pode criar lead novo mesmo sem gerir o pipeline. */
  canCreate?: boolean;
  /** Edição: SDR/Assessor podem editar leads existentes sem gestão total. */
  canEdit?: boolean;
  onScheduleReuniao?: (lead: InvestLead) => void;
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
  canCreate = false,
  canEdit = false,
  onScheduleReuniao,
}: InvestLeadDialogProps) {
  // Editar lead existente exige edit/gestão; criar um novo basta captação.
  const editable = lead ? canManage || canEdit : canManage || canCreate;
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


  const footer = editable ? (
    <div className="flex items-center justify-between gap-2 w-full">
      <div>
        {lead && canManage &&
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
  ) : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="flex max-h-[94vh] w-full max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="hidden">
            <DialogTitle>{lead ? "Editar lead" : "Cadastrar lead"}</DialogTitle>
            <DialogDescription>Formulário de lead de investimentos</DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 py-2.5 pl-5 pr-9">
            <h2 className="text-[15px] font-semibold text-azul-profundo">
              {lead ? "Editar lead" : "Cadastrar lead"}
            </h2>
            {lead && onScheduleReuniao && (
              <Button variant="ghost" onClick={() => onScheduleReuniao(lead)}>
                <CalendarClock className="mr-2 h-4 w-4" /> Marcar reunião
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Coluna 1: Cliente & contato */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1.5">
                Cliente & contato
              </h3>

              <div>
                <Label htmlFor="inv-nome">Nome do lead / cliente</Label>
                <Input
                  id="inv-nome"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="ex.: Construtora Vale Verde"
                  disabled={!editable}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="inv-celular">Celular</Label>
                <Input
                  id="inv-celular"
                  value={form.celular}
                  onChange={(e) => set("celular", e.target.value)}
                  placeholder="(27) 9...."
                  disabled={!editable}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="inv-contato">Contato (pessoa / telefone)</Label>
                <Input
                  id="inv-contato"
                  value={form.contato}
                  onChange={(e) => set("contato", e.target.value)}
                  placeholder="ex.: Sr. Antônio — (27) 9..."
                  disabled={!editable}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Origem</Label>
                <Select value={form.origem} onValueChange={(v) => set("origem", v)} disabled={!editable}>
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
                <Label htmlFor="inv-indicado">Indicado por</Label>
                <Input
                  id="inv-indicado"
                  value={form.indicadoPor}
                  onChange={(e) => set("indicadoPor", e.target.value)}
                  placeholder="quem trouxe o lead"
                  disabled={!editable}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Coluna 2: Qualificação */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1.5">
                Qualificação
              </h3>

              <div>
                <Label htmlFor="inv-pl">PL estimado (R$)</Label>
                <Input
                  id="inv-pl"
                  inputMode="numeric"
                  value={form.pl}
                  onChange={(e) => onPlChange(e.target.value)}
                  placeholder="0,00"
                  disabled={!editable}
                  className="mt-1.5"
                />
                {plBelowFloor && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Abaixo de R$ 1 mi — fora do piso da campanha.
                  </p>
                )}
              </div>

              <div>
                <LabelWithHint hint="Sugerida automaticamente pelo PL. PJ é sempre manual.">
                  Faixa
                </LabelWithHint>
                <Select
                  value={form.faixa}
                  onValueChange={(v) => {
                    setFaixaTouched(true);
                    set("faixa", v as InvestFaixa);
                  }}
                  disabled={!editable}
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
                {lead?.qualificado_por && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    ✓ Qualificado por {lead.qualificado_por.name}
                    {lead.qualificado_em
                      ? ` em ${new Date(lead.qualificado_em).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                )}
              </div>

              <div>
                <Label>Produto de interesse</Label>
                <Select value={form.produto} onValueChange={(v) => set("produto", v)} disabled={!editable}>
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
                  disabled={!editable}
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
                <LabelWithHint htmlFor="inv-prob" hint="Manual por lead — defina a chance real.">
                  Probabilidade (%)
                </LabelWithHint>
                <Input
                  id="inv-prob"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={form.probabilidade}
                  onChange={(e) => set("probabilidade", e.target.value)}
                  disabled={!editable}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Coluna 3: Pitch, follow-up e atribuição */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1.5">
                Ação & atribuição
              </h3>

              <div className="rounded-lg border border-ouro/40 bg-ouro/5 p-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-ouro-escuro" />
                  <Label htmlFor="inv-pitch" className="text-ouro-escuro">
                    Pitch — como vender
                  </Label>
                  <FieldHint>O assessor abre o lead e já vê o pitch antes de atender.</FieldHint>
                </div>
                <Textarea
                  id="inv-pitch"
                  value={form.pitch}
                  onChange={(e) => set("pitch", e.target.value)}
                  placeholder="Motivos e ganchos: ex.: gestão conta PJ; análise de carteira..."
                  disabled={!editable}
                  className="min-h-[56px] bg-branco"
                />
              </div>

              <div>
                <Label htmlFor="inv-obs">Observações da ligação</Label>
                <Textarea
                  id="inv-obs"
                  value={form.obs}
                  onChange={(e) => set("obs", e.target.value)}
                  placeholder="Perfil, objetivos, concorrência, ressalvas..."
                  disabled={!editable}
                  className="mt-1.5 min-h-[56px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inv-passo">Próximo passo</Label>
                  <Input
                    id="inv-passo"
                    value={form.passo}
                    onChange={(e) => set("passo", e.target.value)}
                    placeholder="ex.: Reunião na quinta"
                    disabled={!editable}
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
                    disabled={!editable}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <Label>Responsável</Label>
                  <Select
                    value={form.responsavelId}
                    onValueChange={(v) => set("responsavelId", v)}
                    disabled={!editable}
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
                      Na planilha: <strong>{lead.responsavel_nome}</strong> (não mapeado)
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vendedor</Label>
                    <Select
                      value={form.vendedorId}
                      onValueChange={(v) => set("vendedorId", v)}
                      disabled={!editable}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Quem fecha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem vendedor</SelectItem>
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
                      disabled={!editable}
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
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
