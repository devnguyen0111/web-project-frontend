import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeOrder,
  createOrder,
  getOrderDownloadLink,
  listMyOrders,
  requestCancelOrder,
  requestOrderRefund,
} from "@/lib/api/orders";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("orders api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends create order payload with idempotency key", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(createEnvelope({ _id: "order-1", status: "paid" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createOrder({
      productId: "507f1f77bcf86cd799439011",
      quantity: 1,
      idempotencyKey: "order-key-1",
      customData: { brief: "Need source file" },
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(options.body));

    expect(body.idempotencyKey).toBe("order-key-1");
    expect(body.customData).toEqual({ brief: "Need source file" });
  });

  it("builds query params for my orders", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listMyOrders({ page: 1, limit: 10, status: "quoted" });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/orders/me");
    expect(calledUrl).toContain("status=quoted");
    expect(calledUrl).toContain("limit=10");
  });

  it("builds optional fileId query for download link", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(createEnvelope({ downloadUrl: "https://example.test" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getOrderDownloadLink("order-1", "file-1");

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/orders/order-1/download");
    expect(calledUrl).toContain("fileId=file-1");
  });

  it("calls buyer order action endpoints", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          orderId: "order-1",
          orderNumber: "ORD-001",
          status: "delivered",
          requestType: "refund",
          reason: "Need refund",
          ticket: {
            ticketId: "ticket-1",
            ticketNumber: "TK-001",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await completeOrder("order-1");
    await requestCancelOrder("order-1", { reason: "Changed requirements" });
    await requestOrderRefund("order-1", { reason: "Wrong output delivered" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/orders/order-1/complete");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/orders/order-1/cancel");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/orders/order-1/refund-request");
  });
});
