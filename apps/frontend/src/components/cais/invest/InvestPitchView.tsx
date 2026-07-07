import type { ReactNode } from "react";
import { Phone, Users } from "lucide-react";
import {
  INVEST_FAIXA_INFO,
  type InvestPitch,
  type InvestPitchObjecao,
} from "@/lib/invest-api";

/** Badge do segmento (faixa) com as cores da marca. */
export function PitchFaixaBadge({ faixa }: { faixa: InvestPitch["faixa"] }) {
  const info = INVEST_FAIXA_INFO[faixa];
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: info.color, background: info.bg }}
    >
      {info.label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ouro-escuro">
        {title}
      </div>
      {children}
    </div>
  );
}

function Script({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 border-l-[3px] border-l-ouro bg-slate-50 px-3 py-2 text-[13px] italic leading-relaxed text-slate-600">
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-snug text-slate-600">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Objecoes({ items }: { items: InvestPitchObjecao[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((o, i) => (
        <div key={i}>
          <div className="text-[12.5px] font-semibold text-red-700">{o.q}</div>
          <div className="text-[12.5px] leading-snug text-slate-600">{o.a}</div>
        </div>
      ))}
    </div>
  );
}

function StageHeader({
  icon,
  numero,
  papel,
  objetivo,
}: {
  icon: ReactNode;
  numero: string;
  papel: string;
  objetivo: string;
}) {
  return (
    <div className="mb-3 mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
      <span className="rounded bg-azul-profundo px-2 py-0.5 font-mono text-[11px] font-bold text-branco">
        {numero}
      </span>
      <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-azul-profundo">
        {icon}
        {papel}
      </span>
      <span className="text-[11px] text-slate-400">{objetivo}</span>
    </div>
  );
}

/** Visualização somente-leitura de um pitch do playbook. */
export function InvestPitchView({ pitch }: { pitch: InvestPitch }) {
  const { sdr, assessor } = pitch.conteudo;

  return (
    <div className="text-slate-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PitchFaixaBadge faixa={pitch.faixa} />
        <h3 className="text-[16px] font-semibold text-azul-profundo">{pitch.titulo}</h3>
        {pitch.padrao_do_segmento && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-ouro-escuro">
            ★ Padrão do segmento
          </span>
        )}
        {!pitch.ativo && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            Inativo
          </span>
        )}
      </div>

      {pitch.gancho && (
        <div className="mb-2 rounded-lg border border-ouro/40 bg-ouro/10 px-4 py-3 text-[14px] font-medium leading-snug text-ouro-escuro">
          {pitch.gancho}
        </div>
      )}

      {/* Etapa 1 — SDR */}
      <StageHeader
        icon={<Phone className="h-3.5 w-3.5" />}
        numero="ETAPA 1"
        papel="SDR"
        objetivo="objetivo único: marcar a reunião"
      />
      {sdr.missao && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800">
          🎯 {sdr.missao}
        </div>
      )}
      {sdr.aberturaLigacao && (
        <Section title="Abertura da ligação">
          <Script>{sdr.aberturaLigacao}</Script>
        </Section>
      )}
      {sdr.qualificacao.length > 0 && (
        <Section title="Qualificação rápida">
          <BulletList items={sdr.qualificacao} />
        </Section>
      )}
      {sdr.objecoes.length > 0 && (
        <Section title="Objeções de telefone">
          <Objecoes items={sdr.objecoes} />
        </Section>
      )}
      {sdr.fechamentoAgenda && (
        <Section title="Fechamento da agenda">
          <Script>{sdr.fechamentoAgenda}</Script>
        </Section>
      )}

      {/* Etapa 2 — Assessor */}
      <StageHeader
        icon={<Users className="h-3.5 w-3.5" />}
        numero="ETAPA 2"
        papel="Assessor"
        objetivo="conduzir a reunião e fechar o próximo passo"
      />
      {assessor.preparacao.length > 0 && (
        <Section title="Preparação (antes da reunião)">
          <BulletList items={assessor.preparacao} />
        </Section>
      )}
      {assessor.aberturaReuniao && (
        <Section title="Abertura da reunião">
          <Script>{assessor.aberturaReuniao}</Script>
        </Section>
      )}
      {assessor.descoberta.length > 0 && (
        <Section title="Descoberta">
          <BulletList items={assessor.descoberta} />
        </Section>
      )}
      {assessor.racional && (
        <Section title="Racional da apresentação">
          <p className="text-[13px] leading-relaxed text-slate-700">{assessor.racional}</p>
        </Section>
      )}
      {assessor.arsenal.length > 0 && (
        <Section title="Arsenal BTG + CAIS">
          <BulletList items={assessor.arsenal} />
        </Section>
      )}
      {assessor.objecoes.length > 0 && (
        <Section title="Objeções da reunião">
          <Objecoes items={assessor.objecoes} />
        </Section>
      )}
      {assessor.proximoPasso && (
        <Section title="Próximo passo (fechamento)">
          <p className="text-[13px] font-medium leading-relaxed text-slate-800">
            {assessor.proximoPasso}
          </p>
        </Section>
      )}
    </div>
  );
}
