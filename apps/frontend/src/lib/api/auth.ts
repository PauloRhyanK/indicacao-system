import { apiFetch, clearToken, setToken } from "./client";

export interface AuthRole {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: AuthRole[];
  accessScope: "INTERNAL" | "FULL" | "CONFIDENCIAL";
  createdAt: string;
  mustChangePassword?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  permissions: string[];
}

interface AuthResponse {
  token: string;
  user: AuthUser;
  permissions: string[];
}

interface MeResponse {
  user: AuthUser;
  permissions: string[];
}

export const PASSWORD_SETUP_REQUIRED = "PASSWORD_SETUP_REQUIRED";
export const ACCESS_DENIED_WRONG_REALM = "ACCESS_DENIED_WRONG_REALM";
export const ACCESS_DENIED_NO_RJ = "ACCESS_DENIED_NO_RJ";

export type AuthRealm = "admin" | "confidencial";

export async function login(
  email: string,
  password: string,
  realm: AuthRealm = "admin",
): Promise<AuthSession> {
  const data = await apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password, realm }),
    },
    false,
  );
  setToken(data.token);
  return { user: data.user, permissions: data.permissions };
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    },
    false,
  );
  setToken(data.token);
  return { user: data.user, permissions: data.permissions };
}

export async function fetchMe(): Promise<AuthSession> {
  const data = await apiFetch<MeResponse>("/auth/me");
  return { user: data.user, permissions: data.permissions };
}

export async function setInitialPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<AuthResponse>(
    "/auth/set-initial-password",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  setToken(data.token);
  return { user: data.user, permissions: data.permissions };
}

export function logout(): void {
  clearToken();
}

export { getToken, isAuthenticated } from "./client";
