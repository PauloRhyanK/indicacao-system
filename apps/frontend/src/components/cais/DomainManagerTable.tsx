import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "./Button";
import { inputClass } from "./SlideOver";
import {
  createLookup,
  updateLookup,
  deleteLookup,
  type LookupItem,
  type LookupType,
} from "@/lib/cais-api";

export function DomainManagerTable({
  type,
  title,
  items,
}: {
  type: LookupType;
  title: string;
  items: LookupItem[];
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lookups"] });
  };

  const createMut = useMutation({
    mutationFn: (name: string) => createLookup(type, name),
    onSuccess: () => {
      setNewName("");
      invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateLookup(type, id, name),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLookup(type, id),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-md border border-slate-200 bg-branco p-5">
      <h3 className="mb-3 text-[14px] font-semibold text-azul-profundo">{title}</h3>

      <ul className="mb-4 divide-y divide-slate-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 py-2">
            {editingId === item.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  className={inputClass + " flex-1"}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="rounded p-1 text-green-600 hover:bg-green-50"
                  onClick={() => updateMut.mutate({ id: item.id, name: editName })}
                  disabled={updateMut.isPending}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[14px] text-azul-profundo">{item.name}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{item.slug}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Remover "${item.name}"?`)) deleteMut.mutate(item.id);
                    }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-2 text-[13px] text-slate-500">Nenhum registro.</li>
        )}
      </ul>

      <div className="flex gap-2">
        <input
          className={inputClass + " flex-1"}
          placeholder="Novo valor..."
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

      {(createMut.isError || updateMut.isError || deleteMut.isError) && (
        <p className="mt-2 text-[12px] text-red-600">
          {(createMut.error ?? updateMut.error ?? deleteMut.error)?.message ??
            "Erro na operação."}
        </p>
      )}
    </div>
  );
}
