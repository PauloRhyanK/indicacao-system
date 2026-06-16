import type { UserAccessScope } from "@prisma/client";
import { ROLE_ADMIN_NAME } from "./permissions.js";

export type AuthRealm = "admin" | "confidencial";

export const ACCESS_DENIED_WRONG_REALM = "ACCESS_DENIED_WRONG_REALM";
export const ACCESS_DENIED_NO_RJ = "ACCESS_DENIED_NO_RJ";

export function resolveAccessScope(
  accessScope: UserAccessScope,
  roles: { name: string }[],
): UserAccessScope {
  if (roles.some((r) => r.name === ROLE_ADMIN_NAME)) return "FULL";
  return accessScope;
}

export function canAccessRealm(
  effectiveScope: UserAccessScope,
  realm: AuthRealm,
  permissions: Set<string> | string[],
): boolean {
  const permissionList = Array.isArray(permissions) ? permissions : Array.from(permissions);
  if (realm === "admin") {
    return effectiveScope === "INTERNAL" || effectiveScope === "FULL";
  }
  if (effectiveScope !== "CONFIDENCIAL" && effectiveScope !== "FULL") return false;
  return permissionList.includes("rj.view");
}
