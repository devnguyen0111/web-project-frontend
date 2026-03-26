import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminRevenue, listAuditLogs } from "@/lib/api/admin";
import { getLeaderboard } from "@/lib/api/social";
import { listBadges } from "@/lib/api/badges";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("admin + social + badges api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds admin dashboard revenue query correctly", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          from: "2026-03-01",
          to: "2026-03-31",
          groupBy: "day",
          totalRevenue: 0,
          totalOrders: 0,
          series: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getAdminRevenue({ from: "2026-03-01", to: "2026-03-31", groupBy: "day" });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/admin/dashboard/revenue");
    expect(calledUrl).toContain("from=2026-03-01");
    expect(calledUrl).toContain("to=2026-03-31");
    expect(calledUrl).toContain("groupBy=day");
  });

  it("builds audit filters and leaderboard request correctly", async () => {
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const value = String(url);
      if (value.includes("/admin/audit-logs")) {
        return Promise.resolve(
          createEnvelope({
            data: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        );
      }

      if (value.includes("/users/leaderboard")) {
        return Promise.resolve(
          createEnvelope({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 1,
          }),
        );
      }

      return Promise.resolve(createEnvelope([]));
    });
    vi.stubGlobal("fetch", fetchMock);

    await listAuditLogs({
      page: 1,
      limit: 20,
      severity: "error",
      action: "POST /auth/login",
    });
    await getLeaderboard({ page: 1, limit: 10 });

    const auditUrl = String(fetchMock.mock.calls[0]?.[0]);
    const leaderboardUrl = String(fetchMock.mock.calls[1]?.[0]);

    expect(auditUrl).toContain("/admin/audit-logs");
    expect(auditUrl).toContain("severity=error");
    expect(auditUrl).toContain("action=POST+%2Fauth%2Flogin");
    expect(leaderboardUrl).toContain("/users/leaderboard?page=1&limit=10");
  });

  it("calls public badges endpoint without auth", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope([])));
    vi.stubGlobal("fetch", fetchMock);

    await listBadges();

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/badges");
  });
});
