import { afterEach, describe, expect, it, vi } from "vitest";
import { addCartItem, checkoutCart } from "@/lib/api/cart";
import { createOrder, getOrderDownloadLink, listMyOrders } from "@/lib/api/orders";
import { getStoreProduct, listStoreProducts } from "@/lib/api/products";
import { listStoreOrders } from "@/lib/api/store-management";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("commerce api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds product and order queries", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          createEnvelope({ data: [], total: 0, page: 1, limit: 6, totalPages: 1 }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          createEnvelope({ data: [], total: 0, page: 1, limit: 8, totalPages: 1 }),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve(createEnvelope({ _id: "p1", slug: "slug" })))
      .mockImplementationOnce(() => Promise.resolve(createEnvelope({ _id: "o1" })));
    vi.stubGlobal("fetch", fetchMock);

    await listStoreProducts({ page: 2, limit: 6, search: "ui kit", type: "digital" });
    await listMyOrders({ page: 1, limit: 8, status: "delivered" });
    await getStoreProduct("slug");
    await createOrder({ productId: "p1", quantity: 1, idempotencyKey: "id-1" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/products");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("type=digital");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/orders/me");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("status=delivered");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/products/slug");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/orders");
  });

  it("builds cart and store-management endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          createEnvelope({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(createEnvelope({ orderId: "o1", downloadUrl: "https://example.test" })),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          createEnvelope({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 }),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve(createEnvelope({ _id: "o1" })));
    vi.stubGlobal("fetch", fetchMock);

    await addCartItem({ productId: "p1", quantity: 2 });
    await checkoutCart({ idempotencyKey: "cart-1" });
    await listStoreOrders({ page: 1, limit: 10, status: "processing" });
    await getOrderDownloadLink("o1", "file-1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cart/items");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/cart/checkout");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/store/orders");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("status=processing");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/orders/o1/download");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("fileId=file-1");
  });
});
