import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  approveConfidencialUser,
  createConfidencialUser,
  deleteConfidencialUser,
  fetchConfidencialUsers,
  fetchRjRoles,
  resetConfidencialUserPassword,
  updateConfidencialUserRoles,
  type ConfidencialUser,
  type RoleSummary,
} from "@/lib/cais-api";
import { Badge } from "@/components/cais/Badge";
import { Button } from "@/components/cais/Button";
import { inputClass } from "@/components/cais/SlideOver";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

const DEFAULT_ROLE_NAME = "Acesso Confidencial";

function buildSetupLink(email: string) {
  const url = new URL("/primeiro-acesso", window.location.origin);
  url.searchParams.set("email", email);
  return url.toString();
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function defaultRoleIds(roles: RoleSummary[] | undefined): string[] {
  const id = roles?.find((r) => r.name === DEFAULT_ROLE_NAME)?.id ?? roles?.[0]?.id;
  return id ? [id] : [];
}

function userStatus(user: ConfidencialUser): { label: string; variant: "green" | "amber" | "gold" } {
  if (!user.isApproved) return { label: "Pendente", variant: "amber" };
  if (user.mustChangePassword) return { label: "Sem senha", variant: "gold" };
  return { label: "Ativo", variant: "green" };
}

export function ConfidencialUsersPanel() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["confidencial-users"], queryFn: fetchConfidencialUsers });
  const roles = useQuery({ queryKey: ["rj-roles"], queryFn: fetchRjRoles });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{ name: string; email: string; link: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!roles.data?.length || newRoleIds.length > 0) return;
    setNewRoleIds(defaultRoleIds(roles.data));
  }, [roles.data, newRoleIds.length]);

  const createMut = useMutation({
    mutationFn: () =>
      createConfidencialUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleIds: newRoleIds,
      }),
    onSuccess: (user) => {
      const trimmedEmail = email.trim().toLowerCase();
      setName("");
      setEmail("");
      setNewRoleIds(defaultRoleIds(roles.data));
      setCreatedLink({
        name: user?.name ?? name.trim(),
        email: user?.email ?? trimmedEmail,
        link: buildSetupLink(user?.email ?? trimmedEmail),
      });
      qc.invalidateQueries({ queryKey: ["confidencial-users"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteConfidencialUser,
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["confidencial-users"] });
    },
  });

  const rolesMut = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      updateConfidencialUserRoles(userId, roleIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["confidencial-users"] }),
  });

  const approveMut = useMutation({
    mutationFn: approveConfidencialUser,
    onSuccess: () => {
      setFeedback("Acesso liberado.");
      qc.invalidateQueries({ queryKey: ["confidencial-users"] });
    },
  });

  const resetPwdMut = useMutation({
    mutationFn: resetConfidencialUserPassword,
    onSuccess: (result, userId) => {
      const user = users.data?.find((u) => u.id === userId);
      if (user) {
        setCreatedLink({
          name: user.name,
          email: user.email,
          link: buildSetupLink(user.email),
        });
      }
      setFeedback(result.alreadyPending ? "Senha já pendente de criação." : "Senha resetada.");
      qc.invalidateQueries({ queryKey: ["confidencial-users"] });
    },
  });

  const handleCopyLink = async (key: string, link: string) => {
    await copyToClipboard(link);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sortedUsers = useMemo(() => {
    if (!users.data) return [];
    return [...users.data].sort((a, b) => {
      if (a.isApproved !== b.isApproved) return a.isApproved ? 1 : -1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [users.data]);

  const canCreate = Boolean(name.trim() && email.trim() && newRoleIds.length > 0);

  const toggleNewRole = (roleId: string) => {
    setNewRoleIds((prev) => {
      if (prev.includes(roleId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== roleId);
      }
      return [...prev, roleId];
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-branco p-4">
        <p className="mb-3 text-[13px] font-medium text-azul-profundo">Novo usuário</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={`${inputClass} text-[13px]`}
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={`${inputClass} text-[13px]`}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {roles.data && roles.data.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roles.data.map((r) => {
              const active = newRoleIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleNewRole(r.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
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
        )}
        <div className="mt-3">
          <Button
            variant="primary"
            className="px-4 py-2 text-[13px]"
            disabled={!canCreate || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Criando..." : "Criar"}
          </Button>
        </div>
        {createMut.isError && (
          <p className="mt-2 text-[11px] text-status-red">{(createMut.error as Error).message}</p>
        )}
      </section>

      {createdLink && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-azul-profundo">
                Usuário criado — envie o link para {createdLink.name}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                A pessoa usa o link para criar a senha e já entra com acesso liberado.
              </p>
              <p className="mt-2 truncate rounded-md border border-slate-200 bg-branco px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
                {createdLink.link}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-slate-400 hover:text-slate-600"
              onClick={() => setCreatedLink(null)}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => handleCopyLink("created", createdLink.link)}
              className="inline-flex items-center gap-1.5 rounded-md bg-azul-profundo px-3 py-1.5 text-[12px] font-medium text-branco hover:bg-azul-marinho"
            >
              {copiedKey === "created" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar link
                </>
              )}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-branco">
        {users.isLoading ? (
          <p className="px-4 py-6 text-center text-[12px] text-slate-500">Carregando...</p>
        ) : sortedUsers.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-slate-500">Nenhum usuário.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedUsers.map((user) => {
              const status = userStatus(user);
              return (
                <li key={user.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-medium text-azul-profundo">{user.name}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!user.isApproved && (
                        <button
                          type="button"
                          disabled={approveMut.isPending}
                          onClick={() => approveMut.mutate(user.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-ouro/20 px-2 py-1 text-[11px] font-medium text-azul-profundo hover:bg-ouro/30 disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Liberar
                        </button>
                      )}
                      {user.isApproved && user.mustChangePassword && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(user.id, buildSetupLink(user.email))}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                        >
                          {copiedKey === user.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copiar link
                            </>
                          )}
                        </button>
                      )}
                      {user.isApproved && !user.mustChangePassword && (
                        <button
                          type="button"
                          disabled={resetPwdMut.isPending}
                          onClick={() => resetPwdMut.mutate(user.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset senha
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deleteMut.isPending}
                        onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                        className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  {roles.data && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {roles.data.map((r) => {
                        const active = user.roles.some((ur) => ur.id === r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={rolesMut.isPending}
                            onClick={() => {
                              const next = active
                                ? user.roles.filter((ur) => ur.id !== r.id).map((ur) => ur.id)
                                : [...user.roles.map((ur) => ur.id), r.id];
                              if (next.length === 0) return;
                              rolesMut.mutate({ userId: user.id, roleIds: next });
                            }}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${
                              active
                                ? "border-azul-medio bg-azul-medio/10 text-azul-profundo"
                                : "border-slate-200 text-slate-400"
                            }`}
                          >
                            {r.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {rolesMut.isError && (
        <p className="text-[11px] text-status-red">{(rolesMut.error as Error).message}</p>
      )}
      {approveMut.isError && (
        <p className="text-[11px] text-status-red">{(approveMut.error as Error).message}</p>
      )}
      {resetPwdMut.isError && (
        <p className="text-[11px] text-status-red">{(resetPwdMut.error as Error).message}</p>
      )}
      {feedback && (
        <p className="text-[11px] text-emerald-700">
          {feedback}{" "}
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setFeedback(null)}>
            ✕
          </button>
        </p>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            deleteMut.reset();
          }
        }}
        title="Remover usuário"
        description={
          <>
            Remover <strong className="text-azul-profundo">{deleteTarget?.name}</strong>?
          </>
        }
        confirmLabel="Remover"
        pending={deleteMut.isPending}
        error={deleteMut.isError ? (deleteMut.error as Error).message : null}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
