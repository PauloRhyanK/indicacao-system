import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ImportIssueDetail, ImportReport, ImportUpdateDetail } from "@/lib/cais-api";

function IssueList({ items, emptyLabel }: { items: ImportIssueDetail[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-[13px] text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={`${item.row}-${item.message}`} className="py-2.5">
          <p className="text-[13px] font-medium text-azul-profundo">
            Linha {item.row}
            {item.name ? `: ${item.name}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-600">{item.message}</p>
        </li>
      ))}
    </ul>
  );
}

function CreatedList({ items }: { items: ImportReport["created"] }) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-[13px] text-slate-500">Nenhum lead novo importado.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={`${item.row}-${item.leadId ?? item.name}`} className="py-2.5">
          <p className="text-[13px] font-medium text-azul-profundo">
            Linha {item.row}: {item.name}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-600">
            {item.externalCode ? `Código ${item.externalCode}` : "Sem código"}
            {item.phone ? ` · ${item.phone}` : ""}
          </p>
          {item.leadId && (
            <Link
              to="/leads/$id"
              params={{ id: item.leadId }}
              className="mt-1 inline-block text-[12px] text-azul-medio hover:underline"
            >
              Ver lead
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function UpdatesList({ items }: { items: ImportUpdateDetail[] }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-slate-500">
        Nenhum lead existente foi atualizado.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={`${item.row}-${item.leadId ?? item.name}`} className="py-2.5">
          <p className="text-[13px] font-medium text-azul-profundo">
            Linha {item.row}: {item.name}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {item.externalCode ? `Código ${item.externalCode}` : "Sem código"}
            {item.phone ? ` · ${item.phone}` : ""}
            {item.matchedBy === "externalCode"
              ? " · identificado pelo código"
              : item.matchedBy === "phone"
                ? " · identificado pelo telefone"
                : ""}
          </p>
          <ul className="mt-2 space-y-0.5">
            {item.changes.map((change) => (
              <li key={change} className="text-[12px] text-slate-700">
                {change}
              </li>
            ))}
          </ul>
          {item.leadId && (
            <Link
              to="/leads/$id"
              params={{ id: item.leadId }}
              className="mt-1 inline-block text-[12px] text-azul-medio hover:underline"
            >
              Ver lead
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function defaultReportTab(report: ImportReport): string {
  if (report.updates.length > 0) return "updates";
  if (report.created.length > 0) return "created";
  if (report.errors.length > 0) return "errors";
  if (report.ignored.length > 0) return "ignored";
  return "created";
}

function CreatedUsersList({ items }: { items: NonNullable<ImportReport["createdUsers"]> }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-md border border-ouro/40 bg-ouro/10 p-4">
      <p className="text-[13px] font-semibold text-azul-profundo">
        Usuários criados — informe estes e-mails para primeiro acesso
      </p>
      <p className="mt-1 text-[12px] text-slate-600">
        Cada pessoa deve acessar <strong>/primeiro-acesso</strong> e definir a senha.
      </p>
      <ul className="mt-3 divide-y divide-ouro/20">
        {items.map((u) => (
          <li key={u.email} className="py-2.5">
            <p className="text-[13px] font-medium text-azul-profundo">{u.name}</p>
            <p className="text-[12px] text-slate-700">{u.email}</p>
            {u.sheetAliases.length > 0 && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                Apelidos na planilha: {u.sheetAliases.join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImportReportPanel({ report }: { report: ImportReport }) {
  const created = report.created ?? [];
  const updates = report.updates ?? [];
  const ignored = report.ignored ?? [];
  const errors = report.errors ?? [];
  const createdUsers = report.createdUsers ?? [];

  const normalized: ImportReport = {
    ...report,
    created,
    updates,
    ignored,
    errors,
  };

  const initialTab = defaultReportTab(normalized);

  return (
    <div>
      {report.sheetUsed && (
        <p className="mb-3 text-[12px] text-slate-500">
          Aba importada: <strong>{report.sheetUsed}</strong>
        </p>
      )}

      <CreatedUsersList items={createdUsers} />

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-md bg-green-50 px-2 py-3">
          <p className="text-[20px] font-semibold text-green-700">{normalized.imported}</p>
          <p className="text-[11px] text-green-800">Novos</p>
        </div>
        <div className="rounded-md bg-blue-50 px-2 py-3">
          <p className="text-[20px] font-semibold text-blue-700">{normalized.updated}</p>
          <p className="text-[11px] text-blue-800">Atualizados</p>
        </div>
        <div className="rounded-md bg-amber-50 px-2 py-3">
          <p className="text-[20px] font-semibold text-amber-700">{normalized.skipped}</p>
          <p className="text-[11px] text-amber-800">Ignorados</p>
        </div>
        <div className="rounded-md bg-red-50 px-2 py-3">
          <p className="text-[20px] font-semibold text-red-700">{errors.length}</p>
          <p className="text-[11px] text-red-800">Erros</p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="mt-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="created" className="text-[12px]">
            Novos ({created.length})
          </TabsTrigger>
          <TabsTrigger value="updates" className="text-[12px]">
            Atualizações ({updates.length})
          </TabsTrigger>
          <TabsTrigger value="ignored" className="text-[12px]">
            Ignorados ({ignored.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="text-[12px]">
            Erros ({errors.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 px-3">
          <TabsContent value="created">
            <CreatedList items={created} />
          </TabsContent>
          <TabsContent value="updates">
            <UpdatesList items={updates} />
          </TabsContent>
          <TabsContent value="ignored">
            <IssueList items={ignored} emptyLabel="Nenhuma linha ignorada." />
          </TabsContent>
          <TabsContent value="errors">
            <IssueList items={errors} emptyLabel="Nenhum erro na importação." />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
