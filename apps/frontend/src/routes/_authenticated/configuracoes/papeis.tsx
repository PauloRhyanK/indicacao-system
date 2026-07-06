import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/cais/Button";
import { PageLoader } from "@/components/cais/Feedback";
import { inputClass } from "@/components/cais/SlideOver";
import { cn } from "@/lib/utils";
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

type SystemKey = "investimento" | "consorcio" | "confidencial" | "admin" | "outros";

/** Cada grupo de permissões pertence a um sistema. */
const SYSTEM_OF_GROUP: Record<string, SystemKey> = {
  Investimentos: "investimento",
  Leads: "consorcio",
  Vendas: "consorcio",
  Indicações: "consorcio",
  Metas: "consorcio",
  Dashboard: "consorcio",
  "Recuperacao Judicial": "confidencial",
  Administração: "admin",
};

const SYSTEMS: { key: SystemKey; label: string; color: string }[] = [
  { key: "investimento", label: "Investimento", color: "#b0913f" },
  { key: "consorcio", label: "Consórcio", color: "#346f93" },
  { key: "confidencial", label: "Confidencial (RJ)", color: "#6b5b95" },
  { key: "admin", label: "Administração", color: "#64748b" },
  { key: "outros", label: "Outros", color: "#94a3b8" },
];

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
  const [search, setSearch] = useState("");

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

  const setMany = (permKeys: string[], on: boolean) => {
    setKeys((prev) => {
      const next = new Set(prev);
      for (const k of permKeys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
    setDirty(true);
  };

  const q = search.trim().toLowerCase();
  const totalPerms = useMemo(
    () => catalog.reduce((s, g) => s + g.permissions.length, 0),
    [catalog],
  );

  // Agrupa o catálogo por sistema, aplicando a busca.
  const bySystem = useMemo(() => {
    const map = new Map<SystemKey, PermissionGroup[]>();
    for (const group of catalog) {
      const sys = SYSTEM_OF_GROUP[group.groupName] ?? "outros";
      const perms = q
        ? group.permissions.filter(
            (p) =>
              p.label.toLowerCase().includes(q) ||
              (p.description ?? "").toLowerCase().includes(q) ||
              group.groupName.toLowerCase().includes(q),
          )
        : group.permissions;
      if (perms.length === 0) continue;
      const arr = map.get(sys) ?? [];
      arr.push({ groupName: group.groupName, permissions: perms });
      map.set(sys, arr);
    }
    return map;
  }, [catalog, q]);

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-slate-500">
          <strong className="text-azul-profundo">{keys.size}</strong> de {totalPerms} permissões
          selecionadas
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className={inputClass + " w-[220px] pl-8 text-[13px]"}
            placeholder="Buscar permissão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-5">
        {SYSTEMS.filter((s) => bySystem.has(s.key)).map((system) => {
          const groups = bySystem.get(system.key)!;
          const allKeys = groups.flatMap((g) => g.permissions.map((p) => p.key));
          const selectedCount = allKeys.filter((k) => keys.has(k)).length;
          const allOn = selectedCount === allKeys.length;
          return (
            <div key={system.key} className="rounded-md border border-slate-200">
              <div
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5"
                style={{ borderLeft: `3px solid ${system.color}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-azul-profundo">
                    {system.label}
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-400">
                    {selectedCount}/{allKeys.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMany(allKeys, !allOn)}
                  className="text-[11px] font-medium text-azul-medio hover:text-azul-profundo"
                >
                  {allOn ? "Limpar" : "Marcar todas"}
                </button>
              </div>
              <div className="p-3">
                {groups.map((group) => (
                  <div key={group.groupName} className="mb-3 last:mb-0">
                    {groups.length > 1 && (
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {group.groupName}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
                      {group.permissions.map((p) => {
                        const on = keys.has(p.key);
                        return (
                          <label
                            key={p.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
                              on
                                ? "border-azul-medio/40 bg-azul-medio/5"
                                : "border-transparent hover:bg-slate-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={on}
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {bySystem.size === 0 && (
          <p className="py-8 text-center text-[13px] text-slate-400">
            Nenhuma permissão encontrada para "{search}".
          </p>
        )}
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
