import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/cais/Button";
import { RjReuniaoDrawer } from "@/components/cais/rj/RjReuniaoDrawer";
import {
  createRjReuniao,
  fetchRjCredorReunioes,
  type RjReuniaoInput,
  type RjReuniaoUpdateInput,
} from "@/lib/cais-api";
import {
  RJ_REUNIAO_STATUS_LABELS,
  RJ_REUNIAO_STATUS_PILL_CLASS,
} from "@/lib/rj-constants";
import { formatRjDateTime } from "@/lib/rj-format";
import { usePermissions } from "@/lib/use-permissions";

export function RjCredorReunioesSection({ credorId }: { credorId: string }) {
  const { canRjAgendaView, canRjAgendaManage } = usePermissions();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const enabled = canRjAgendaView();

  const query = useQuery({
    queryKey: ["rj-credor-reunioes", credorId],
    queryFn: () => fetchRjCredorReunioes(credorId),
    enabled,
  });

  const reunioes = query.data ?? [];

  const proxima = useMemo(() => {
    const now = Date.now();
    return [...reunioes]
      .filter((r) => r.status === "agendada" && new Date(r.dataHoraInicio).getTime() >= now)
      .sort((a, b) => +new Date(a.dataHoraInicio) - +new Date(b.dataHoraInicio))[0];
  }, [reunioes]);

  const createMutation = useMutation({
    mutationFn: (input: RjReuniaoInput) => createRjReuniao(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credor-reunioes", credorId] });
      void queryClient.invalidateQueries({ queryKey: ["rj-reunioes"] });
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setDrawerOpen(false);
    },
  });

  const handleSave = async (input: RjReuniaoInput | RjReuniaoUpdateInput) => {
    await createMutation.mutateAsync(input as RjReuniaoInput);
  };

  if (!enabled) return null;

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-azul-profundo">Reuniões</h3>
        {canRjAgendaManage() && (
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-[12px]"
            onClick={() => setDrawerOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" /> Agendar
          </Button>
        )}
      </div>

      {proxima && (
        <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
            Próxima reunião
          </div>
          <div className="text-[13px] font-medium text-azul-profundo">{proxima.titulo}</div>
          <div className="text-[12px] text-slate-600">
            {formatRjDateTime(proxima.dataHoraInicio)}
            {proxima.local ? ` · ${proxima.local}` : ""}
          </div>
        </div>
      )}

      {query.isLoading ? (
        <p className="text-[12px] text-slate-400">Carregando…</p>
      ) : reunioes.length === 0 ? (
        <p className="text-[12px] text-slate-400">Nenhuma reunião registrada.</p>
      ) : (
        <ul className="space-y-1.5">
          {reunioes.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2 text-[12px]"
            >
              <div>
                <div className="font-medium text-azul-profundo">{r.titulo}</div>
                <div className="text-slate-500">{formatRjDateTime(r.dataHoraInicio)}</div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${RJ_REUNIAO_STATUS_PILL_CLASS[r.status]}`}
              >
                {RJ_REUNIAO_STATUS_LABELS[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canRjAgendaManage() && (
        <RjReuniaoDrawer
          open={drawerOpen}
          reuniao={null}
          fixedCredorId={credorId}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
          saving={createMutation.isPending}
        />
      )}
    </div>
  );
}
