const fs = require('fs');
const file = 'apps/frontend/src/components/cais/invest/InvestLeadDialog.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import \{\n  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogHeader,\n  DialogTitle,\n\} from "@\/components\/ui\/dialog";/,
  'import { SlideOver } from "@/components/cais/SlideOver";'
);

const footerLogic = `
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
`;

const newJsx = `  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={lead ? "Editar lead" : "Cadastrar lead"}
      maxWidthClass="max-w-4xl"
      footer={footer}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna Esquerda: Dados do Cliente e Qualificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-azul-profundo border-b border-slate-100 pb-2 mb-2">Perfil do Cliente</h3>
          
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Faixa</Label>
              <Select
                value={form.faixa}
                onValueChange={(v) => {
                  setFaixaTouched(true);
                  set("faixa", v);
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
              <p className="mt-1 text-[11px] text-slate-500">
                Sugerida pelo PL.
              </p>
              {lead?.qualificado_por && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  ✓ Qualificado por {lead.qualificado_por.name}
                  {lead.qualificado_em
                    ? \` em \${new Date(lead.qualificado_em).toLocaleDateString("pt-BR")}\`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
                onValueChange={(v) => set("etapa", v)}
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
              disabled={!editable}
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-slate-500">Manual por lead — defina a chance real.</p>
          </div>
        </div>

        {/* Coluna Direita: Inteligência e Ação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-azul-profundo border-b border-slate-100 pb-2 mb-2">Ação & Follow-up</h3>

          <div className="rounded-lg border border-ouro/40 bg-ouro/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Compass className="h-4 w-4 text-ouro-escuro" />
              <Label htmlFor="inv-pitch" className="text-ouro-escuro">
                Pitch — como vender para este cliente
              </Label>
            </div>
            <Textarea
              id="inv-pitch"
              value={form.pitch}
              onChange={(e) => set("pitch", e.target.value)}
              placeholder="Motivos e ganchos: ex.: gestão conta PJ; análise de carteira..."
              disabled={!editable}
              className="min-h-[72px] bg-branco"
            />
            <p className="mt-1 text-[11px] text-slate-500">O assessor abre o lead e já vê o pitch antes de atender.</p>
          </div>

          <div>
            <Label htmlFor="inv-obs">Observações da ligação</Label>
            <Textarea
              id="inv-obs"
              value={form.obs}
              onChange={(e) => set("obs", e.target.value)}
              placeholder="Perfil, objetivos, concorrência, ressalvas..."
              disabled={!editable}
              className="mt-1.5 min-h-[96px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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

          <div className="space-y-4 pt-4 mt-2 border-t border-slate-100">
            <h4 className="text-[13px] font-medium text-slate-700">Atribuição</h4>
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
                  Na planilha: <strong>{lead.responsavel_nome}</strong> (não mapeado a um usuário)
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendedor / Assessor</Label>
                <Select
                  value={form.vendedorId}
                  onValueChange={(v) => set("vendedorId", v)}
                  disabled={!editable}
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
    </SlideOver>
  );`;

const parts = content.split('  return (');
if (parts.length === 2) {
  const newContent = parts[0] + footerLogic + '\n' + newJsx + '\n}\n';
  fs.writeFileSync(file, newContent);
  console.log('File successfully updated!');
} else {
  console.log('Error: Could not split file content correctly.');
}
