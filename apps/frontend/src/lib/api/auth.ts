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
  createdAt: string;
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

export async function login(email: string, password: string): Promise<AuthSession> {
  const data = await apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

export function logout(): void {
  clearToken();
}

export { getToken, isAuthenticated } from "./client";
