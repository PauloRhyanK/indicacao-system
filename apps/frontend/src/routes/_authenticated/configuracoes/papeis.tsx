import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/cais/Button";
import { PageLoader } from "@/components/cais/Feedback";
import { inputClass } from "@/components/cais/SlideOver";
import {
  createRole,
  deleteRole,
  fetchPermissionsCatalog,
  fetchRoles,
  updateRoleName,
  updateRolePermissions,
  type PermissionGroup,
  type RoleSummary,
} from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes/papeis")({
  head: () => ({ meta: [{ title: "Papéis — CAIS" }] }),
  component: PapeisPage,
});

function PapeisPage() {
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const catalog = useQuery({ queryKey: ["permissions-catalog"], queryFn: fetchPermissionsCatalog });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (roles.data?.length && !selectedId) {
      setSelectedId(roles.data[0].id);
    }
  }, [roles.data, selectedId]);

  const selected = roles.data?.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <Link
        to="/configuracoes"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-azul-medio hover:text-azul-profundo"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Configurações
      </Link>

      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-azul-profundo">Papéis e Permissões</h1>
        <p className="text-[14px] text-slate-500">
          Crie papéis e defina quais ações cada perfil pode realizar.
        </p>
      </div>

      {roles.isLoading || catalog.isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <RoleList
            roles={roles.data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {selected && catalog.data && (
            <RoleEditor role={selected} catalog={catalog.data} />
          )}
        </div>
      )}
    </>
  );
}

function RoleList({
  roles,
  selectedId,
  onSelect,
}: {
  roles: RoleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const createMut = useMutation({
    mutationFn: (name: string) => createRole(name),
    onSuccess: (role) => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["roles"] });
      onSelect(role.id);
    },
  });

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-4">
      <p className="mb-3 text-[13px] font-semibold text-azul-profundo">Papéis</p>
      <ul className="space-y-1">
        {roles.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                selectedId === r.id
                  ? "bg-azul-medio/10 font-medium text-azul-profundo"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.name}
              {r.isSystem && (
                <span className="ml-1.5 text-[11px] text-slate-400">(sistema)</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <input
          className={inputClass + " flex-1 text-[13px]"}
          placeholder="Novo papel..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              e.preventDefault();
              createMut.mutate(newName.trim());
            }
          }}
        />
        <Button
          variant="ghost"
          disabled={!newName.trim() || createMut.isPending}
          onClick={() => createMut.mutate(newName.trim())}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RoleEditor({
  role,
  catalog,
}: {
  role: RoleSummary;
  catalog: PermissionGroup[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(role.name);
  const [keys, setKeys] = useState<Set<string>>(new Set(role.permissionKeys));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(role.name);
    setKeys(new Set(role.permissionKeys));
    setDirty(false);
  }, [role.id, role.name, role.permissionKeys]);

  const saveNameMut = useMutation({
    mutationFn: () => updateRoleName(role.id, name.trim()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const savePermsMut = useMutation({
    mutationFn: () => updateRolePermissions(role.id, Array.from(keys)),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteRole(role.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const toggle = (key: string) => {
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDirty(true);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            className={inputClass + " max-w-xs"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== role.name) saveNameMut.mutate();
            }}
          />
          {role.isSystem && (
            <span className="text-[12px] text-slate-400">Papel do sistema</span>
          )}
        </div>
        {!role.isSystem && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm(`Excluir o papel "${role.name}"?`)) deleteMut.mutate();
            }}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        )}
      </div>

      <div className="space-y-6">
        {catalog.map((group) => (
          <div key={group.groupName}>
            <h3 className="mb-2 text-[14px] font-semibold text-azul-profundo">
              {group.groupName}
            </h3>
            <ul className="space-y-2">
              {group.permissions.map((p) => (
                <li key={p.key}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={keys.has(p.key)}
                      onChange={() => toggle(p.key)}
                    />
                    <span>
                      <span className="text-[13px] text-azul-profundo">{p.label}</span>
                      {p.description && (
                        <span className="mt-0.5 block text-[12px] text-slate-500">
                          {p.description}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {dirty && (
        <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4">
          <Button disabled={savePermsMut.isPending} onClick={() => savePermsMut.mutate()}>
            Salvar permissões
          </Button>
          {savePermsMut.isError && (
            <span className="text-[12px] text-red-600">
              {(savePermsMut.error as Error).message}
            </span>
          )}
        </div>
      )}

      <p className="mt-4 text-[12px] text-slate-400">
        {role.userCount} usuário(s) com este papel
      </p>
    </div>
  );
}
