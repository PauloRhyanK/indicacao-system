import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { DomainManagerTable } from "@/components/cais/DomainManagerTable";
import { inputClass } from "@/components/cais/SlideOver";
import {
  createTeamUser,
  fetchLookups,
  fetchMetaPeriod,
  fetchProfiles,
  fetchRoles,
  formatBRL,
  formatDate,
  updateUserRoles,
  type Profile,
} from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — CAIS" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user } = Route.useRouteContext();
  const { can } = usePermissions();
  const canManageUsers = can("users.manage");
  const canManageSettings = can("settings.manage");
  const canManageRoles = can("roles.manage");

  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: canManageUsers || canManageRoles,
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Configurações</h1>
        <p className="text-[14px] text-slate-500">
          Conta, meta do período, equipe e domínios do sistema.
        </p>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Sua Conta</SectionHeader>
        <p className="text-[14px] text-azul-profundo">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {user.roles.map((r) => (
            <Badge key={r.id} variant={r.isSystem && r.name === "Administrador" ? "gold" : "gray"}>
              {r.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Meta do Período</SectionHeader>
        {meta.isLoading ? (
          <PageLoader />
        ) : meta.data ? (
          <div className="space-y-3 text-[14px] text-azul-profundo">
            <div className="space-y-1">
              <p className="font-medium">{meta.data.period_label}</p>
              <p>Objetivo: {formatBRL(meta.data.target_value)}</p>
              <p className="text-[12px] text-slate-500">
                {formatDate(meta.data.start_date)} — {formatDate(meta.data.end_date)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">Nenhuma meta de período configurada.</p>
        )}
        <Link
          to="/configuracoes/metas"
          className="mt-3 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-azul-medio transition-colors hover:border-azul-medio hover:bg-white hover:text-azul-profundo"
        >
          Gerenciar metas →
        </Link>
      </div>

      {canManageRoles && (
        <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
          <SectionHeader>Papéis e Permissões</SectionHeader>
          <p className="mb-3 text-[13px] text-slate-500">
            Configure papéis e defina quais permissões cada um possui.
          </p>
          <Link
            to="/configuracoes/papeis"
            className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-azul-medio transition-colors hover:border-azul-medio hover:bg-white hover:text-azul-profundo"
          >
            Gerenciar papéis →
          </Link>
        </div>
      )}

      <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
        <SectionHeader>Equipe</SectionHeader>
        {profiles.isLoading ? (
          <PageLoader />
        ) : (
          <>
            <ul className="divide-y divide-slate-200">
              {(profiles.data ?? []).map((p) => (
                <TeamMemberRow
                  key={p.id}
                  profile={p}
                  allRoles={roles.data ?? []}
                  canEdit={canManageUsers}
                />
              ))}
            </ul>
            {canManageUsers && <CreateUserForm roles={roles.data ?? []} />}
          </>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-[18px] font-semibold text-azul-profundo">
            Domínios do Sistema
          </h2>
          <p className="mb-4 text-[13px] text-slate-500">
            {canManageSettings
              ? "Gerencie os valores permitidos para status, origens, próximas ações e tipos de consórcio."
              : "Valores permitidos para status, origens, próximas ações e tipos de consórcio (somente leitura)."}
          </p>
        </div>

        {lookups.isLoading ? (
          <PageLoader />
        ) : (
          <>
            <DomainManagerTable
              type="status"
              title="Status de Lead"
              items={lookups.data?.statuses ?? []}
              readOnly={!canManageSettings}
            />
            <DomainManagerTable
              type="source"
              title="Origens"
              items={lookups.data?.sources ?? []}
              readOnly={!canManageSettings}
            />
            <DomainManagerTable
              type="action"
              title="Próximas Ações"
              items={lookups.data?.nextActions ?? []}
              readOnly={!canManageSettings}
            />
            <DomainManagerTable
              type="consortium"
              title="Tipos de Consórcio"
              items={lookups.data?.consortiumTypes ?? []}
              readOnly={!canManageSettings}
            />
          </>
        )}
      </div>
    </>
  );
}

function TeamMemberRow({
  profile,
  allRoles,
  canEdit,
}: {
  profile: Profile;
  allRoles: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(profile.roles.map((r) => r.id));
  const [dirty, setDirty] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => updateUserRoles(profile.id, selected),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const toggleRole = (roleId: string) => {
    setSelected((prev) => {
      const next = prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId];
      setDirty(true);
      return next;
    });
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-azul-profundo">{profile.name}</p>
          <p className="text-[12px] text-slate-500">{profile.email}</p>
        </div>
        {!canEdit && (
          <div className="flex flex-wrap gap-1.5">
            {profile.roles.map((r) => (
              <Badge key={r.id} variant="gray">
                {r.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {canEdit && allRoles.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {allRoles.map((r) => {
            const active = selected.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRole(r.id)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                  active
                    ? "border-azul-medio bg-azul-medio/10 text-azul-profundo"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {r.name}
              </button>
            );
          })}
          {dirty && (
            <Button
              variant="ghost"
              disabled={selected.length === 0 || saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              Salvar
            </Button>
          )}
          {saveMut.isError && (
            <span className="text-[12px] text-red-600">
              {(saveMut.error as Error).message}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function CreateUserForm({ roles }: { roles: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const createMut = useMutation({
    mutationFn: () =>
      createTeamUser({
        name: name.trim(),
        email: email.trim(),
        password,
        roleIds,
      }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setRoleIds([]);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-[13px] font-medium text-azul-medio hover:text-azul-profundo"
      >
        + Adicionar usuário
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-[13px] font-medium text-azul-profundo">Novo usuário</p>
      <input
        className={inputClass}
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Senha (mín. 6 caracteres)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => {
          const active = roleIds.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() =>
                setRoleIds((prev) =>
                  active ? prev.filter((id) => id !== r.id) : [...prev, r.id],
                )
              }
              className={`rounded-full border px-2.5 py-1 text-[12px] ${
                active
                  ? "border-azul-medio bg-azul-medio/10 text-azul-profundo"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {r.name}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button
          disabled={
            !name.trim() ||
            !email.trim() ||
            password.length < 6 ||
            roleIds.length === 0 ||
            createMut.isPending
          }
          onClick={() => createMut.mutate()}
        >
          Criar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {createMut.isError && (
        <p className="text-[12px] text-red-600">{(createMut.error as Error).message}</p>
      )}
    </div>
  );
}
