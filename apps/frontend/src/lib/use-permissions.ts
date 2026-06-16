import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { fetchMe } from "@/lib/api/auth";

export function usePermissions() {
  const ctx = useRouteContext({ from: "/_authenticated" });
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    staleTime: 30_000,
    initialData: { user: ctx.user, permissions: ctx.permissions ?? [] },
  });

  const permissions = me.data.permissions;
  const set = new Set(permissions);

  return {
    permissions,
    can: (key: string) => set.has(key),
    canAny: (...keys: string[]) => keys.some((k) => set.has(k)),
  };
}

/** Pagamentos de recompensas (equipe, indicação, confirmação). */
export function canManageRewardPayments(can: (key: string) => boolean) {
  return can("rewards.payments") || can("rewards.manage");
}

/**
 * Registrar cashback/voucher do cliente.
 * Colaboradores têm sales.view_all sem rewards.payments — esse perfil também pode preencher a escolha.
 */
export function canEditClientRewardChoice(can: (key: string) => boolean) {
  if (can("rewards.client_choice") || can("rewards.manage")) return true;
  return !canManageRewardPayments(can) && can("sales.view_all");
}
