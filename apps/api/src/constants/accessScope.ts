import type { UserAccessScope } from "@prisma/client";

export type AuthRealm = "admin" | "confidencial";

export const ACCESS_DENIED_WRONG_REALM = "ACCESS_DENIED_WRONG_REALM";
export const ACCESS_DENIED_NO_RJ = "ACCESS_DENIED_NO_RJ";
export const ACCESS_PENDING_APPROVAL = "ACCESS_PENDING_APPROVAL";

export function resolveAccessScope(accessScope: UserAccessScope): UserAccessScope {
  return accessScope;
}

export function isConfidencialUserApproved(user: {
  accessScope: UserAccessScope;
  confidencialApprovedAt: Date | null;
}): boolean {
  if (user.accessScope !== "CONFIDENCIAL") return true;
  return user.confidencialApprovedAt != null;
}

export function canAccessRealm(
  accessScope: UserAccessScope,
  realm: AuthRealm,
  permissions: Set<string> | string[],
): boolean {
  const permissionList = Array.isArray(permissions) ? permissions : Array.from(permissions);
  if (realm === "admin") {
    return accessScope === "INTERNAL";
  }
  if (accessScope !== "CONFIDENCIAL") return false;
  return permissionList.includes("rj.view");
}
