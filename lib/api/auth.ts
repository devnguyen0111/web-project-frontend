import { apiRequest } from "@/lib/api/http";
import { clearTokens, setTokens } from "@/lib/api/token-store";
import type {
  AuthPayload,
  AuthUser,
  RegisterResponse,
  VerifyEmailResponse,
} from "@/lib/types";

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface VerifyEmailPayload {
  email: string;
  code: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export async function register(payload: RegisterPayload) {
  const response = await apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

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
  try {
    await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearTokens();
  }
}

export async function verifyEmail(payload: VerifyEmailPayload) {
  const response = await apiRequest<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

  return response.data;
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const response = await apiRequest<{ message: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: payload,
      skipAuth: true,
    },
  );

  return response.data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const response = await apiRequest<{ message: string }>(
    "/auth/reset-password",
    {
      method: "POST",
      body: payload,
      skipAuth: true,
    },
  );

  return response.data;
}
