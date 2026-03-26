import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listAdminTickets,
  listMyTickets,
  listTicketAssignees,
} from "@/lib/api/tickets";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("tickets api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds query params for my tickets list", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          data: [],
          total: 0,
          page: 2,
          limit: 5,
          totalPages: 1,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listMyTickets({
      page: 2,
      limit: 5,
      status: "open",
      q: "TK-2026",
      relatedType: "order",
      relatedId: "507f1f77bcf86cd799439011",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/tickets/me");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("status=open");
    expect(calledUrl).toContain("q=TK-2026");
    expect(calledUrl).toContain("relatedType=order");
    expect(calledUrl).toContain("relatedId=507f1f77bcf86cd799439011");
  });

  it("builds query params for admin ticket list", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAdminTickets({
      page: 1,
      limit: 20,
      status: "in_progress",
      assignedTo: "507f1f77bcf86cd799439011",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/admin/tickets");
    expect(calledUrl).toContain("status=in_progress");
    expect(calledUrl).toContain("assignedTo=507f1f77bcf86cd799439011");
  });

  it("calls assignees endpoint", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope([{ id: "507f1f77bcf86cd799439011", fullName: "Staff", role: "staff" }]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listTicketAssignees();

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/admin/tickets/assignees");
  });
});
