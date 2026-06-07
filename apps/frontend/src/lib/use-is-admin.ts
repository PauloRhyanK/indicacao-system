import { getRouteApi } from "@tanstack/react-router";

const authenticatedRoute = getRouteApi("/_authenticated");

export function useIsAdmin(): boolean {
  const { user } = authenticatedRoute.useRouteContext();
  return user.role === "ADMIN";
}
