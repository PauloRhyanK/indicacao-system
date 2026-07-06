import { redirect } from "@tanstack/react-router";

/** Permissões carregadas no contexto do _authenticated. */
export function permsFromContext(context: unknown): string[] {
  return (context as { permissions?: string[] }).permissions ?? [];
}

/**
 * Guarda de rota do módulo de investimentos: exige ao menos uma das
 * permissões. Sem elas, redireciona — para o próprio investimento se o
 * usuário ao menos vê o módulo, senão para o consórcio.
 */
export function requireInvestPerm(context: unknown, anyOf: string[]): void {
  const perms = permsFromContext(context);
  if (anyOf.some((p) => perms.includes(p))) return;
  throw redirect({ to: perms.includes("investimentos.view") ? "/investimentos" : "/dashboard" });
}
