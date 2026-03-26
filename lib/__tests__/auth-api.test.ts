import { afterEach, describe, expect, it, vi } from "vitest";

const setTokensMock = vi.fn();
const clearTokensMock = vi.fn();

vi.mock("@/lib/api/token-store", () => ({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: (...args: unknown[]) => setTokensMock(...args),
  clearTokens: () => clearTokensMock(),
}));

import { login, verifyTwoFactor } from "@/lib/api/auth";

function buildEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("auth api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setTokensMock.mockReset();
    clearTokensMock.mockReset();
  });

  it("does not persist tokens when login requires two-factor challenge", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        buildEnvelope({
          requiresTwoFactor: true,
          twoFactorToken: "challenge-token",
          expiresInSeconds: 300,
          user: { id: "u1" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({
      email: "author@example.com",
      password: "password123",
    });

    expect(result.requiresTwoFactor).toBe(true);
    expect(setTokensMock).not.toHaveBeenCalled();
  });

  it("persists tokens when login is successful", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        buildEnvelope({
          user: { id: "u1" },
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({
      email: "author@example.com",
      password: "password123",
    });

    expect("accessToken" in result).toBe(true);
    expect(setTokensMock).toHaveBeenCalledWith("access-token", "refresh-token");
  });

  it("persists tokens when verifyTwoFactor returns login success payload", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        buildEnvelope({
          requiresTwoFactor: false,
          user: { id: "u1" },
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyTwoFactor({
      token: "challenge-token",
      code: "123456",
    });

    expect("accessToken" in result).toBe(true);
    expect(setTokensMock).toHaveBeenCalledWith("access-token", "refresh-token");
  });
});
