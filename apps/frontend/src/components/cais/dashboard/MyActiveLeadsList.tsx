import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/cais/Badge";
import { type PersonalDashboardLead } from "@/lib/cais-api";

interface MyActiveLeadsListProps {
  leads: PersonalDashboardLead[];
  totalCount: number;
}

export function MyActiveLeadsList({ leads, totalCount }: MyActiveLeadsListProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-[1px] text-slate-500">
          Meus leads ativos
        </h3>
        {totalCount > leads.length && (
          <Link
            to="/leads"
            className="text-[12px] font-medium text-azul-medio hover:text-azul-profundo"
          >
            Ver todos ({totalCount}) →
          </Link>
        )}
      </div>

      {leads.length === 0 ? (
        <p className="mt-4 text-[13px] text-slate-500">Nenhum lead ativo atribuído a você.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200">
          {leads.map((lead) => (
            <li key={lead.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                to="/leads/$id"
                params={{ id: lead.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md transition-colors hover:bg-slate-50 -mx-2 px-2 py-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-azul-profundo">{lead.name}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">{lead.statusName}</p>
                </div>
                <StatusBadge slug={lead.statusSlug} status={lead.statusName} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
