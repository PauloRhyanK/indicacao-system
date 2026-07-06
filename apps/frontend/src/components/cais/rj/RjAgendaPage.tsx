import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, List, Plus } from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import type { View } from "react-big-calendar";
import { Button } from "@/components/cais/Button";
import { RjAgendaCalendar } from "@/components/cais/rj/RjAgendaCalendar";
import { RjAgendaList } from "@/components/cais/rj/RjAgendaList";
import { RjReuniaoDrawer } from "@/components/cais/rj/RjReuniaoDrawer";
import { RjReuniaoDetailDrawer } from "@/components/cais/rj/RjReuniaoDetailDrawer";
import { RjCredorStatusSuggestionBanner } from "@/components/cais/rj/RjCredorStatusSuggestionBanner";
import {
  createRjReuniao,
  deleteRjReuniao,
  fetchRjReunioes,
  updateRjCredorStatus,
  updateRjReuniao,
  updateRjReuniaoStatus,
  type RjReuniao,
  type RjReuniaoInput,
  type RjReuniaoStatus,
  type RjReuniaoUpdateInput,
  type RjSugestaoStatusCredor,
} from "@/lib/cais-api";
import { usePermissions } from "@/lib/use-permissions";
import { loadRjAgendaPrefs, saveRjAgendaPrefs } from "@/lib/rj-agenda-prefs";
import { humanizeErrorMessage } from "@/lib/humanize-error";

type Mode = "calendar" | "list";
type Scope = "mine" | "all";

function toYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function rangeFor(view: View, date: Date) {
  if (view === "day") return { de: startOfDay(date), ate: endOfDay(date) };
  if (view === "week") {
    return { de: startOfWeek(date), ate: endOfWeek(date) };
  }
  return { de: startOfWeek(startOfMonth(date)), ate: endOfWeek(endOfMonth(date)) };
}

export function RjAgendaPage() {
  const { canRjAgendaManage, canRjAgendaViewAll } = usePermissions();
  const canManage = canRjAgendaManage();
  const canViewAll = canRjAgendaViewAll();
  const queryClient = useQueryClient();

  const savedPrefs = useMemo(() => loadRjAgendaPrefs(), []);

  const [mode, setMode] = useState<Mode>(savedPrefs.mode);
  const [scope, setScope] = useState<Scope>(
    savedPrefs.scope === "all" && !canViewAll ? "mine" : savedPrefs.scope,
  );
  const [calView, setCalView] = useState<View>(savedPrefs.calView as View);
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    const validCalView = (calView === "week" || calView === "day" ? calView : "month") as "month" | "week" | "day";
    saveRjAgendaPrefs({ mode, calView: validCalView, scope });
  }, [mode, calView, scope]);

  useEffect(() => {
    if (!canViewAll && scope === "all") setScope("mine");
  }, [canViewAll, scope]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RjReuniao | null>(null);
  const [detail, setDetail] = useState<RjReuniao | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [sugestao, setSugestao] = useState<RjSugestaoStatusCredor | null>(null);

  const range = useMemo(() => rangeFor(calView, calDate), [calView, calDate]);

  const filters = useMemo(
    () => ({
      de: toYmd(range.de),
      ate: toYmd(range.ate),
      userId: scope === "all" && canViewAll ? "all" : undefined,
    }),
    [range, scope, canViewAll],
  );

  const query = useQuery({
    queryKey: ["rj-reunioes", filters],
    queryFn: () => fetchRjReunioes(filters),
  });

  const reunioes = query.data ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["rj-reunioes"] });
  };

  const createMutation = useMutation({
    mutationFn: (input: RjReuniaoInput) => createRjReuniao(input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setDrawerOpen(false);
      setEditing(null);
      setFeedback({ type: "ok", msg: "Reunião agendada. Status do credor atualizado." });
    },
    onError: (e: Error) => {
      const msg = humanizeErrorMessage(e);
      if (msg) setFeedback({ type: "err", msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RjReuniaoUpdateInput }) =>
      updateRjReuniao(id, input),
    onSuccess: () => {
      invalidate();
      setDrawerOpen(false);
      setEditing(null);
      setFeedback({ type: "ok", msg: "Reunião atualizada." });
    },
    onError: (e: Error) => {
      const msg = humanizeErrorMessage(e);
      if (msg) setFeedback({ type: "err", msg });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      resultado,
    }: {
      id: string;
      status: RjReuniaoStatus;
      resultado?: string | null;
    }) => updateRjReuniaoStatus(id, status, resultado),
    onSuccess: (res) => {
      invalidate();
      setDetail(res.reuniao);
      setFeedback({ type: "ok", msg: "Status da reunião atualizado." });
      if (res.sugestaoStatusCredor) setSugestao(res.sugestaoStatusCredor);
    },
    onError: (e: Error) => {
      const msg = humanizeErrorMessage(e);
      if (msg) setFeedback({ type: "err", msg });
    },
  });

  const credorStatusMutation = useMutation({
    mutationFn: ({ credorId, status }: { credorId: string; status: RjReuniao["credor"]["status"] }) =>
      updateRjCredorStatus(credorId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-credores"] });
      setSugestao(null);
      setFeedback({ type: "ok", msg: "Status do credor atualizado." });
    },
    onError: (e: Error) => {
      const msg = humanizeErrorMessage(e);
      if (msg) setFeedback({ type: "err", msg });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRjReuniao,
    onSuccess: () => {
      invalidate();
      setDetail(null);
      setFeedback({ type: "ok", msg: "Reunião excluída." });
    },
    onError: (e: Error) => {
      const msg = humanizeErrorMessage(e);
      if (msg) setFeedback({ type: "err", msg });
    },
  });

  const handleSave = async (input: RjReuniaoInput | RjReuniaoUpdateInput, id?: string) => {
    if (id) {
      await updateMutation.mutateAsync({ id, input });
    } else {
      await createMutation.mutateAsync(input as RjReuniaoInput);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Controle Interno · Confidencial
          </div>
          <h1 className="text-[26px] font-semibold text-azul-profundo">Agenda de Reuniões</h1>
          <p className="text-[14px] text-slate-500">
            Reuniões com credores do condomínio · Recuperação Judicial
          </p>
        </div>
        {canManage && (
          <Button
            variant="gold"
            className="text-[13px]"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Agendar reunião
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-[13px] ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{feedback.msg}</span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => setFeedback(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {sugestao && (
        <RjCredorStatusSuggestionBanner
          sugestao={sugestao}
          pending={credorStatusMutation.isPending}
          onConfirm={() =>
            credorStatusMutation.mutate({
              credorId: sugestao.credorId,
              status: sugestao.status,
            })
          }
          onDismiss={() => setSugestao(null)}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          <ToggleButton active={mode === "calendar"} onClick={() => setMode("calendar")}>
            <CalendarDays className="h-4 w-4" /> Calendário
          </ToggleButton>
          <ToggleButton active={mode === "list"} onClick={() => setMode("list")}>
            <List className="h-4 w-4" /> Lista
          </ToggleButton>
        </div>

        {canViewAll && (
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            <ToggleButton active={scope === "mine"} onClick={() => setScope("mine")}>
              Minha agenda
            </ToggleButton>
            <ToggleButton active={scope === "all"} onClick={() => setScope("all")}>
              Toda a equipe
            </ToggleButton>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <p className="text-[14px] text-slate-500">Carregando reuniões…</p>
      ) : query.isError ? (
        <p className="text-[14px] text-red-600">Não foi possível carregar as reuniões.</p>
      ) : mode === "calendar" ? (
        <RjAgendaCalendar
          reunioes={reunioes}
          view={calView}
          date={calDate}
          onView={setCalView}
          onNavigate={setCalDate}
          onSelectEvent={setDetail}
        />
      ) : (
        <RjAgendaList reunioes={reunioes} onSelect={setDetail} />
      )}

      {canManage && (
        <RjReuniaoDrawer
          open={drawerOpen}
          reuniao={editing}
          onClose={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <RjReuniaoDetailDrawer
        open={detail !== null}
        reuniao={detail}
        canManage={canManage}
        statusPending={statusMutation.isPending}
        deletePending={deleteMutation.isPending}
        onClose={() => setDetail(null)}
        onEdit={(r) => {
          setDetail(null);
          setEditing(r);
          setDrawerOpen(true);
        }}
        onChangeStatus={(id, status, resultado) =>
          statusMutation.mutate({ id, status, resultado })
        }
        onDelete={(r) => deleteMutation.mutate(r.id)}
      />
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "bg-azul-profundo text-branco" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
