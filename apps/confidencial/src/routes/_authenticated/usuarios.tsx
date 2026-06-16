import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfidencialLayout } from "../../components/ConfidencialLayout";
import {
  createConfidencialUser,
  deleteConfidencialUser,
  fetchConfidencialUsers,
} from "@/lib/cais-api";
import { Button } from "@/components/cais/Button";
import { inputClass } from "@/components/cais/SlideOver";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!context.permissions.includes("rj.manage")) {
      throw redirect({ to: "/credores" });
    }
  },
  component: UsuariosRoute,
});

function UsuariosRoute() {
  return (
    <ConfidencialLayout canManageUsers>
      <ConfidencialUsersPage />
    </ConfidencialLayout>
  );
}

function ConfidencialUsersPage() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["confidencial-users"], queryFn: fetchConfidencialUsers });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createConfidencialUser({ name: name.trim(), email: email.trim().toLowerCase() }),
    onSuccess: () => {
      setName("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["confidencial-users"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteConfidencialUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["confidencial-users"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-azul-profundo">Usuários do confidencial</h1>
          <p className="mt-1 text-[13px] text-slate-600">
            Contas criadas aqui entram <strong>somente</strong> neste ambiente. Administradores
            acessam admin e confidencial.
          </p>
        </div>
        <Link
          to="/credores"
          className="text-[13px] font-medium text-azul-corporativo hover:text-ouro-escuro"
        >
          ← Voltar aos credores
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-branco p-5">
        <h2 className="text-[14px] font-semibold text-azul-profundo">Novo usuário</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          A pessoa define a senha em{" "}
          <Link to="/primeiro-acesso" className="font-medium text-azul-corporativo">
            primeiro acesso
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={inputClass}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button
            disabled={!name.trim() || !email.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Criando..." : "Criar usuário"}
          </Button>
        </div>
        {createMut.isError && (
          <p className="mt-2 text-[12px] text-status-red">{(createMut.error as Error).message}</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-branco">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-azul-profundo">Cadastrados</h2>
        </div>
        {users.isLoading ? (
          <p className="px-5 py-4 text-[13px] text-slate-500">Carregando...</p>
        ) : users.data?.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-slate-500">Nenhum usuário confidencial ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.data?.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <div className="text-[13px] font-medium text-azul-profundo">{user.name}</div>
                  <div className="text-[12px] text-slate-500">{user.email}</div>
                  {user.mustChangePassword && (
                    <span className="mt-1 inline-block text-[11px] text-amber-700">
                      Aguardando primeiro acesso
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover ${user.name}?`)) deleteMut.mutate(user.id);
                  }}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
