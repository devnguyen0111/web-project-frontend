import { apiRequest } from "@/lib/api/http";
import { clearTokens, setTokens } from "@/lib/api/token-store";
import type { AuthPayload, AuthUser } from "@/lib/types";

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload) {
  const response = await apiRequest<AuthPayload>("/auth/register", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data;
}

export async function me() {
  const response = await apiRequest<AuthUser>("/auth/me", {
    method: "GET",
  });

  return response.data;
}

export async function logout() {
  await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
  clearTokens();
}
