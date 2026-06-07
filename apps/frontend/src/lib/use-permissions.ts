import { useRouteContext } from "@tanstack/react-router";

export function usePermissions() {
  const ctx = useRouteContext({ from: "/_authenticated" });
  const permissions = ctx.permissions ?? [];
  const set = new Set(permissions);

  return {
    permissions,
    can: (key: string) => set.has(key),
    canAny: (...keys: string[]) => keys.some((k) => set.has(k)),
  };
}
