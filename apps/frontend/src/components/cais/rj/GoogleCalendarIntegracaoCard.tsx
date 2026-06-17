import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Loader2, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/cais/Button";
import {
  disconnectRjGoogleIntegracao,
  fetchRjGoogleAuthUrl,
  fetchRjGoogleIntegracaoStatus,
} from "@/lib/cais-api-google";
import { humanizeErrorMessage } from "@/lib/humanize-error";

export function GoogleCalendarIntegracaoCard({
  flashMessage,
  flashError,
}: {
  flashMessage?: string | null;
  flashError?: string | null;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["rj-google-integracao"],
    queryFn: fetchRjGoogleIntegracaoStatus,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectRjGoogleIntegracao,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rj-google-integracao"] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(humanizeErrorMessage(err, "default") ?? "Não foi possível desconectar");
    },
  });

  const handleConnect = async () => {
    setActionError(null);
    setConnecting(true);
    try {
      const url = await fetchRjGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      setActionError(
        humanizeErrorMessage(err, "default") ??
          "Não foi possível iniciar a conexão com o Google",
      );
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (
      !window.confirm(
        "Desconectar o Google Calendar? O calendário secundário CAIS · RJ será removido da sua conta Google.",
      )
    ) {
      return;
    }
    disconnectMutation.mutate();
  };

  const status = statusQuery.data;
  const loading = statusQuery.isLoading;
  const connected = status?.conectado === true;
  const expired = status?.expirado === true;

  return (
    <div className="rounded-lg border border-slate-200 bg-branco p-4">
      <h3 className="text-[14px] font-semibold text-azul-profundo">Integrações de agenda</h3>
      <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-slate-600">
        Conecte sua conta Google para que as reuniões em que você participa sejam adicionadas
        automaticamente à sua agenda pessoal, no calendário secundário{" "}
        <span className="font-medium text-azul-profundo">CAIS · RJ</span>.
      </p>

      {(flashMessage || flashError || actionError || status?.ultimoErro) && (
        <div className="mt-3 space-y-1">
          {flashMessage && (
            <p className="flex items-center gap-1.5 text-[12px] text-emerald-700">
              <Check className="h-3.5 w-3.5 shrink-0" />
              {flashMessage}
            </p>
          )}
          {(flashError || actionError) && (
            <p className="text-[12px] text-red-600">{flashError ?? actionError}</p>
          )}
          {expired && !flashMessage && (
            <p className="text-[12px] text-amber-800">
              Conexão expirada — reconecte sua conta Google para retomar a sincronização automática.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : connected ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-[13px] text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p>
                  Conectado como{" "}
                  <span className="font-medium text-azul-profundo">{status?.googleEmail}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Calendário: &quot;{status?.calendarName}&quot;
                </p>
                {status?.ultimoSyncEm && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Última sincronização:{" "}
                    {new Date(status.ultimoSyncEm).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-[12px] text-slate-600"
              disabled={disconnectMutation.isPending}
              onClick={handleDisconnect}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              Desconectar
            </Button>
          </div>
        ) : (
          <Button
            variant="gold"
            className="text-[13px]"
            disabled={connecting}
            onClick={() => void handleConnect()}
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Conectar Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
}
