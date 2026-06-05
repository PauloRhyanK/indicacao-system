import { apiFetch, clearToken, setToken } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CONSULTANT";
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  setToken(data.token);
  return data.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiFetch<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    },
    false,
  );
  setToken(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await apiFetch<MeResponse>("/auth/me");
  return data.user;
}

export function logout(): void {
  clearToken();
}

export { getToken, isAuthenticated } from "./client";
