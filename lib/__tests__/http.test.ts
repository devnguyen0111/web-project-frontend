import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "@/lib/api/http";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api/token-store";

vi.mock("@/lib/api/token-store", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(getAccessToken).mockReset();
    vi.mocked(getRefreshToken).mockReset();
    vi.mocked(setTokens).mockReset();
    vi.mocked(clearTokens).mockReset();
  });

  it("parses success envelope", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await apiRequest<{ ok: boolean }>("/health", {
      method: "GET",
      skipAuth: true,
    });

    expect(response.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes error envelope", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: ["Invalid email", "Too short"], statusCode: 422 }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    let capturedError: unknown;
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        skipAuth: true,
        body: { email: "bad" },
      });
    } catch (caughtError) {
      capturedError = caughtError;
    }

    expect(capturedError).toBeInstanceOf(ApiError);
    expect((capturedError as ApiError).statusCode).toBe(422);
    expect((capturedError as ApiError).message).toBe("Invalid email, Too short");
  });

  it("refreshes token and retries once on 401", async () => {
    vi.mocked(getAccessToken).mockReturnValue("expired-token");
    vi.mocked(getRefreshToken).mockReturnValue("refresh-token");

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/secure")) {
        const callIndex = fetchMock.mock.calls.filter((call) => call[0] === url).length;
        if (callIndex === 1) {
          return new Response(JSON.stringify({ message: "Unauthorized", statusCode: 401 }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, data: { id: "ok" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: "u1",
                fullName: "User",
                email: "user@example.com",
                role: "author",
                isEmailVerified: true,
                isActive: true,
                wallet: {
                  balance: 0,
                  frozenBalance: 0,
                  totalEarned: 0,
                  totalSpent: 0,
                  lifetimeDeposit: 0,
                },
                subscription: {
                  planCode: "free",
                  planName: "Free",
                  basePostLimit: 0,
                  extraPosts: 0,
                  monthlyPriceCoins: 0,
                  billingCycle: "monthly",
                  autoRenew: false,
                  cancelAtPeriodEnd: false,
                  status: "active",
                  startedAt: new Date().toISOString(),
                  currentPeriodStart: new Date().toISOString(),
                  currentPeriodEnd: new Date().toISOString(),
                  postsUsedInPeriod: 0,
                  renewedAt: new Date().toISOString(),
                },
                postQuota: {
                  allowedPosts: 0,
                  usedPosts: 0,
                  remainingPosts: 0,
                  exhausted: false,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              accessToken: "fresh-access",
              refreshToken: "fresh-refresh",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await apiRequest<{ id: string }>("/secure", { method: "GET" });

    expect(response.data.id).toBe("ok");
    expect(setTokens).toHaveBeenCalledWith("fresh-access", "fresh-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps form-data requests without forcing json content-type", async () => {
    vi.mocked(getAccessToken).mockReturnValue("access-token");

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Content-Type")).toBeNull();
      expect(headers.get("Authorization")).toBe("Bearer access-token");

      return new Response(JSON.stringify({ success: true, data: { uploaded: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.append("file", new Blob(["abc"]), "a.txt");

    const response = await apiRequest<{ uploaded: boolean }>("/upload/image", {
      method: "POST",
      body: formData,
    });

    expect(response.data.uploaded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
