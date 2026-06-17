import { apiFetch } from "@/lib/api/client";

export interface RjGoogleIntegracaoStatus {
  conectado: boolean;
  expirado: boolean;
  googleEmail: string | null;
  calendarName: string;
  conectadoEm: string | null;
  ultimoSyncEm: string | null;
  ultimoErro: string | null;
}

export async function fetchRjGoogleIntegracaoStatus(): Promise<RjGoogleIntegracaoStatus> {
  const res = await apiFetch<{ data: RjGoogleIntegracaoStatus }>(
    "/rj/integracoes/google/status",
  );
  return res.data;
}

export async function fetchRjGoogleAuthUrl(): Promise<string> {
  const res = await apiFetch<{ data: { url: string } }>("/rj/integracoes/google/auth-url");
  return res.data.url;
}

export async function disconnectRjGoogleIntegracao(): Promise<void> {
  await apiFetch("/rj/integracoes/google", { method: "DELETE" });
}
