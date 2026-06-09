export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[CAIS]", error, context);
}
