import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useActiveSystem } from "@/lib/use-active-system";
import { Badge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { PageLoader, SectionHeader } from "@/components/cais/Feedback";
import { DomainManagerTable } from "@/components/cais/DomainManagerTable";
import {
  INVEST_FAIXAS,
  INVEST_FAIXA_INFO,
  fetchAssessorFaixas,
  fetchInvestConfig,
  setAssessorFaixas,
  type InvestFaixa,
} from "@/lib/invest-api";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/cais/SlideOver";
import {
  createTeamUser,
  deleteUser,
  fetchLookups,
  fetchMetaPeriod,
  fetchProfiles,
  fetchRoles,
  formatBRL,
  formatDate,
  updateUserRoles,
  requireUserPasswordSetup,
  type Profile,
} from "@/lib/cais-api";
import { ApiError } from "@/lib/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const canManageInvest = can("investimentos.manage");

  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const lookups = useQuery({ queryKey: ["lookups"], queryFn: fetchLookups });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: canManageUsers || canManageRoles,
  });
  const faixas = useQuery({
    queryKey: ["assessor-faixas"],
    queryFn: fetchAssessorFaixas,
    enabled: canManageInvest,
  });

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { activeSystem } = useActiveSystem(pathname);
  const isInvest = activeSystem === "investimento";
  const investConfig = useQuery({
    queryKey: ["invest-config"],
    queryFn: fetchInvestConfig,
    enabled: isInvest && canManageInvest,
  });

  const allProfiles = profiles.data ?? [];
  const internos = allProfiles.filter((p) => p.access_scope !== "CONFIDENCIAL");
  const confidenciais = allProfiles.filter((p) => p.access_scope === "CONFIDENCIAL");

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
        <SectionHeader>{isInvest ? "Meta de captação — BNF" : "Meta do Período"}</SectionHeader>
        {isInvest ? (
          <div className="space-y-1 text-[14px] text-azul-profundo">
            <p className="font-medium">Campanha BNF · Investimento</p>
            <p>Objetivo: {formatBRL(investConfig.data?.meta ?? 0)}</p>
            <p className="text-[12px] text-slate-500">Meta de captação / AUC</p>
          </div>
        ) : meta.isLoading ? (
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
            Gerenciar Permissões →
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
              {internos.map((p) => (
                <TeamMemberRow
                  key={p.id}
                  profile={p}
                  allRoles={roles.data ?? []}
                  canEdit={canManageUsers}
                  currentUserId={user.id}
                  canManageInvest={canManageInvest}
                  faixas={faixas.data?.[p.id] ?? []}
                />
              ))}
            </ul>
            {canManageUsers && <CreateUserForm roles={roles.data ?? []} />}
          </>
        )}
      </div>

      {confidenciais.length > 0 && (
        <div className="mb-6 rounded-md border border-slate-200 bg-branco p-5">
          <SectionHeader>Acesso Confidencial</SectionHeader>
          <p className="mb-3 text-[13px] text-slate-500">
            Contas do ambiente confidencial (Recuperação Judicial), separadas da equipe geral.
            A gestão destes usuários é feita dentro do próprio sistema confidencial.
          </p>
          <ul className="divide-y divide-slate-200">
            {confidenciais.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-[14px] font-medium text-azul-profundo">{p.name}</p>
                  <p className="text-[12px] text-slate-500">{p.email}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.roles.map((r) => (
                    <Badge key={r.id} variant="gray">
                      {r.name}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-[18px] font-semibold text-azul-profundo">
            Domínios do Sistema
          </h2>
          <p className="mb-4 text-[13px] text-slate-500">
            {canManageSettings
              ? "Gerencie os valores permitidos para status e tipos de consórcio."
              : "Valores permitidos para status e tipos de consórcio (somente leitura)."}
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
  currentUserId,
  canManageInvest,
  faixas,
}: {
  profile: Profile;
  allRoles: { id: string; name: string }[];
  canEdit: boolean;
  currentUserId: string;
  canManageInvest: boolean;
  faixas: InvestFaixa[];
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(profile.roles.map((r) => r.id));
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);

  const faixaMut = useMutation({
    mutationFn: (next: InvestFaixa[]) => setAssessorFaixas(profile.id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessor-faixas"] });
      qc.invalidateQueries({ queryKey: ["invest-assessores"] });
    },
  });

  const toggleFaixa = (f: InvestFaixa) => {
    const next = faixas.includes(f) ? faixas.filter((x) => x !== f) : [...faixas, f];
    faixaMut.mutate(next);
  };

  const saveMut = useMutation({
    mutationFn: () => updateUserRoles(profile.id, selected),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteUser(profile.id),
    onSuccess: () => {
      setDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const resetPwMut = useMutation({
    mutationFn: () => requireUserPasswordSetup(profile.id),
    onSuccess: () => {
      setResetPwOpen(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-azul-profundo">{profile.name}</p>
            {profile.must_change_password && (
              <Badge variant="gold">Senha pendente</Badge>
            )}
          </div>
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
      {canEdit && profile.id !== currentUserId && (
        <div className="mt-2 flex flex-wrap gap-3">
          {!profile.must_change_password && (
            <button
              type="button"
              onClick={() => setResetPwOpen(true)}
              className="text-[12px] font-medium text-azul-medio hover:text-azul-profundo"
            >
              Resetar senha
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-[12px] font-medium text-red-600 hover:text-red-700"
          >
            Excluir usuário
          </button>
        </div>
      )}
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
      {canEdit && canManageInvest && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Atende (investimento):
          </span>
          {INVEST_FAIXAS.map((f) => {
            const active = faixas.includes(f);
            const info = INVEST_FAIXA_INFO[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFaixa(f)}
                disabled={faixaMut.isPending}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                  active ? "" : "border-slate-200 text-slate-400 hover:border-slate-300",
                )}
                style={
                  active
                    ? { color: info.color, backgroundColor: info.bg, borderColor: info.color }
                    : undefined
                }
              >
                {info.label}
              </button>
            );
          })}
          {faixas.length === 0 && (
            <span className="text-[11px] italic text-slate-400">atende todas as faixas</span>
          )}
        </div>
      )}

      <AlertDialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar senha</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{profile.name}</strong> precisará acessar{" "}
              <strong>a página de primeiro acesso</strong> com o e-mail{" "}
              <strong>{profile.email}</strong> e definir uma nova senha antes de entrar
              normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resetPwMut.isError && (
            <p className="px-6 text-[13px] text-red-600">
              {resetPwMut.error instanceof ApiError
                ? resetPwMut.error.message
                : "Não foi possível atualizar o usuário."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPwMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetPwMut.isPending}
              onClick={() => resetPwMut.mutate()}
            >
              {resetPwMut.isPending ? "Salvando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{profile.name}</strong>? Leads vinculados
              como vendedor responsável ou co-vendedor serão desatribuídos. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMut.isError && (
            <p className="px-6 text-[13px] text-red-600">
              {deleteMut.error instanceof ApiError
                ? deleteMut.error.message
                : "Não foi possível excluir o usuário."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              {deleteMut.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        {roles.filter((r) => r.name !== "Acesso Confidencial").map((r) => {
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
