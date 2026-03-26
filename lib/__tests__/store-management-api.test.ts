import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveManagedProduct,
  approvePendingProduct,
  createManagedProduct,
  createStoreOrderQuote,
  deliverStoreOrder,
  getStoreDashboardSummary,
  listStoreOrders,
  listManagedProducts,
  listPendingReviewProducts,
  rejectPendingProduct,
  submitManagedProductForReview,
  updateStoreOrderStatus,
  updateManagedProduct,
  uploadManagedProductFile,
} from "@/lib/api/store-management";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createFetchMock(data: unknown) {
  const fetchMock = vi.fn(() => Promise.resolve(createEnvelope(data)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("store management api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds query params when listing store orders", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listStoreOrders({ page: 1, limit: 20, status: "processing" });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/store/orders");
    expect(calledUrl).toContain("status=processing");
  });

  it("posts quote payload", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ _id: "o1" })));
    vi.stubGlobal("fetch", fetchMock);

    await createStoreOrderQuote("o1", {
      priceAmount: 500000,
      estimatedDays: 3,
      note: "Includes source files",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/store/orders/o1/quote");
  });

  it("uploads delivery file with form data", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ _id: "o1" })));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "delivery.txt", { type: "text/plain" });
    await deliverStoreOrder("o1", file);

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("updates store order status with patch endpoint", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ _id: "o1", status: "processing" })));
    vi.stubGlobal("fetch", fetchMock);

    await updateStoreOrderStatus("o1", {
      status: "processing",
      note: "Quote accepted, work started",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(calledUrl).toContain("/store/orders/o1/status");
    expect(options.method).toBe("PATCH");
  });

  it("gets store dashboard summary", async () => {
    const fetchMock = createFetchMock({
      totalOrders: 1,
      paidOrders: 1,
      deliveredOrders: 0,
      completedOrders: 0,
      grossRevenue: 500000,
      ordersLast7Days: 1,
    });

    await getStoreDashboardSummary();

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/store/dashboard");
  });

  it("builds pending review query params", async () => {
    const fetchMock = createFetchMock({
      data: [],
      total: 0,
      page: 2,
      limit: 15,
      totalPages: 0,
    });

    await listPendingReviewProducts(2, 15);

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/store/products/pending-review");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=15");
  });

  it("posts moderation actions for pending products", async () => {
    const fetchMock = createFetchMock({ _id: "p1" });

    await approvePendingProduct("p1");
    await rejectPendingProduct("p1", { reason: "Missing compliance metadata" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/store/products/p1/approve");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/store/products/p1/reject");
    const rejectOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(String(rejectOptions.body)).toContain("Missing compliance metadata");
  });

  it("calls managed product endpoints", async () => {
    const fetchMock = createFetchMock({ _id: "p1" });

    await listManagedProducts(3, 12);
    await createManagedProduct({
      name: "Template Kit",
      type: "digital",
      priceAmount: 120000,
      currency: "VND",
    });
    await updateManagedProduct("p1", { stock: 5 });
    await archiveManagedProduct("p1");
    await submitManagedProductForReview("p1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/products/me?page=3&limit=12");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/products");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/products/p1");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/products/p1");
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain("/products/p1/submit-review");
  });

  it("uploads managed product asset with form data", async () => {
    const fetchMock = createFetchMock({ _id: "p1" });

    const file = new File(["asset"], "asset.zip", { type: "application/zip" });
    await uploadManagedProductFile("p1", file);

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(calledUrl).toContain("/products/p1/file");
    expect(options.body).toBeInstanceOf(FormData);
  });
});
