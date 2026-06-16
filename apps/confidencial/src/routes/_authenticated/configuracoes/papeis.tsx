import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/cais/Button";
import { PageLoader } from "@/components/cais/Feedback";
import { inputClass } from "@/components/cais/SlideOver";
import { ConfirmDeleteDialog } from "../../../components/ConfirmDeleteDialog";
import {
  createRjRole,
  deleteRjRole,
  fetchRjPermissionsCatalog,
  fetchRjRoles,
  updateRjRoleName,
  updateRjRolePermissions,
  type PermissionGroup,
  type RoleSummary,
} from "@/lib/cais-api";

export const Route = createFileRoute("/_authenticated/configuracoes/papeis")({
  head: () => ({ meta: [{ title: "Papéis — CAIS Confidencial" }] }),
  component: PapeisPage,
});

function PapeisPage() {
  const roles = useQuery({ queryKey: ["rj-roles"], queryFn: fetchRjRoles });
  const catalog = useQuery({
    queryKey: ["rj-permissions-catalog"],
    queryFn: fetchRjPermissionsCatalog,
  });
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
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-azul-profundo"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Configurações
      </Link>

      <h1 className="mb-4 text-[18px] font-semibold text-azul-profundo">Papéis e permissões</h1>

      {roles.isLoading || catalog.isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <RoleList roles={roles.data ?? []} selectedId={selectedId} onSelect={setSelectedId} />
          {selected && catalog.data && <RoleEditor role={selected} catalog={catalog.data} />}
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
    mutationFn: (name: string) => createRjRole(name),
    onSuccess: (role) => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["rj-roles"] });
      onSelect(role.id);
    },
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-branco p-3">
      <ul className="space-y-0.5">
        {roles.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={`w-full rounded px-2 py-1.5 text-left text-[12px] ${
                selectedId === r.id
                  ? "bg-slate-100 font-medium text-azul-profundo"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-1.5">
        <input
          className={`${inputClass} flex-1 py-1.5 text-[12px]`}
          placeholder="Novo papel"
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
          className="px-2 py-1.5"
          disabled={!newName.trim() || createMut.isPending}
          onClick={() => createMut.mutate(newName.trim())}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {createMut.isError && (
        <p className="mt-1.5 text-[11px] text-status-red">{(createMut.error as Error).message}</p>
      )}
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
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setName(role.name);
    setKeys(new Set(role.permissionKeys));
    setDirty(false);
  }, [role.id, role.name, role.permissionKeys]);

  const saveNameMut = useMutation({
    mutationFn: () => updateRjRoleName(role.id, name.trim()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rj-roles"] }),
  });

  const savePermsMut = useMutation({
    mutationFn: () => updateRjRolePermissions(role.id, Array.from(keys)),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["rj-roles"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteRjRole(role.id),
    onSuccess: () => {
      setDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["rj-roles"] });
    },
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
    <div className="rounded-lg border border-slate-200 bg-branco p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <input
          className={`${inputClass} max-w-[220px] py-1.5 text-[13px]`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== role.name && !role.isSystem) {
              saveNameMut.mutate();
            }
          }}
          readOnly={role.isSystem}
        />
        {!role.isSystem && (
          <button
            type="button"
            className="text-[11px] text-red-600 hover:underline"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="mr-0.5 inline h-3 w-3" />
            Excluir
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {catalog.flatMap((group) =>
          group.permissions.map((p) => (
            <li key={p.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={keys.has(p.key)}
                  onChange={() => toggle(p.key)}
                />
                <span className="text-[12px] text-azul-profundo">{p.label}</span>
              </label>
            </li>
          )),
        )}
      </ul>

      {dirty && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button
            variant="primary"
            className="px-3 py-1.5 text-[12px]"
            disabled={savePermsMut.isPending}
            onClick={() => savePermsMut.mutate()}
          >
            Salvar
          </Button>
          {savePermsMut.isError && (
            <span className="ml-2 text-[11px] text-red-600">
              {(savePermsMut.error as Error).message}
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">{role.userCount} usuário(s)</p>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) deleteMut.reset();
        }}
        title="Excluir papel"
        description={
          <>
            Excluir <strong className="text-azul-profundo">{role.name}</strong>?
          </>
        }
        confirmLabel="Excluir"
        pending={deleteMut.isPending}
        error={deleteMut.isError ? (deleteMut.error as Error).message : null}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
