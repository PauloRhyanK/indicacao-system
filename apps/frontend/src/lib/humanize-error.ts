/**
 * Converte mensagens técnicas do navegador/API em texto amigável em português.
 * Retorna `null` quando o erro deve ser ignorado (ex.: usuário cancelou).
 */
export function humanizeErrorMessage(
  error: unknown,
  context: "default" | "calendar" = "default",
): string | null {
  if (!(error instanceof Error)) {
    return context === "calendar"
      ? "Não foi possível adicionar ao calendário. Tente novamente ou use Google Calendar."
      : "Algo deu errado. Tente novamente.";
  }

  if (error.name === "AbortError") {
    return null;
  }

  const raw = error.message.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (
    error.name === "NotAllowedError" ||
    lower === "permission denied" ||
    lower.includes("permission denied") ||
    lower.includes("not allowed")
  ) {
    if (context === "calendar") {
      return "Não conseguimos abrir o calendário. Toque em \"Permitir\" se o navegador pedir acesso, ou use Google Calendar / Outlook acima.";
    }
    return "Você não tem permissão para esta ação. Se precisar de acesso, fale com o administrador RJ.";
  }

  if (
    lower === "forbidden" ||
    lower === "access denied" ||
    lower === "unauthorized" ||
    lower === "acesso negado"
  ) {
    return "Você não tem permissão para esta ação. Se precisar de acesso, fale com o administrador RJ.";
  }

  if (context === "calendar" && (lower.includes("share") || lower.includes("compartilh"))) {
    return "Não foi possível compartilhar com o calendário. Tente Google Calendar ou Outlook.";
  }

  return raw;
}
