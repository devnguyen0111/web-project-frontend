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

type ErrorEnvelope = {
  message?: string | string[];
  statusCode?: number;
};

export class ApiError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function parseJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (response.status === 204) {
    return { success: response.ok, data: undefined as unknown as T };
  }

  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new ApiError("Request failed", { statusCode: response.status });
    }

    return { success: response.ok, data: undefined as unknown as T };
  }

  let payload: ApiEnvelope<T> & ErrorEnvelope;
  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new ApiError("Request failed", { statusCode: response.status });
    }
    throw new ApiError("Failed to parse response from server");
  }

  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : payload.message ?? "Request failed";

    throw new ApiError(message, {
      statusCode: payload.statusCode ?? response.status,
      details: payload,
    });
  }

  return payload;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
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

    const payload = await parseJson<AuthPayload>(response);
    setTokens(payload.data.accessToken, payload.data.refreshToken);
    return payload.data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
