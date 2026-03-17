import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api/token-store";
import type { ApiEnvelope, AuthPayload } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

type RequestConfig = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

async function parseJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json()) as ApiEnvelope<T> & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const payload = (await response.json()) as ApiEnvelope<AuthPayload>;
  setTokens(payload.data.accessToken, payload.data.refreshToken);
  return payload.data.accessToken;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}) {
  const headers = new Headers(config.headers);
  const isFormData =
    typeof FormData !== "undefined" && config.body instanceof FormData;

  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (!config.skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...config,
    headers,
    body: config.body
      ? isFormData
        ? (config.body as BodyInit)
        : JSON.stringify(config.body)
      : undefined,
  });

  if (
    response.status === 401 &&
    !config.skipAuth &&
    !path.includes("/auth/refresh")
  ) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      headers.set("Authorization", `Bearer ${newAccessToken}`);
      const retried = await fetch(`${API_BASE_URL}${path}`, {
        ...config,
        headers,
        body: config.body
          ? isFormData
            ? (config.body as BodyInit)
            : JSON.stringify(config.body)
          : undefined,
      });
      return parseJson<T>(retried);
    }
  }

  return parseJson<T>(response);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
