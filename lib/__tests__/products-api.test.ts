import { afterEach, describe, expect, it, vi } from "vitest";
import { getProductDetail, listProducts } from "@/lib/api/products";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("products api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds query params when listing products", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          data: [],
          total: 0,
          page: 2,
          limit: 12,
          totalPages: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listProducts({
      page: 2,
      limit: 12,
      type: "custom_order",
      search: "logo",
      categoryId: "507f1f77bcf86cd799439011",
      vipOnly: true,
      minPrice: 10000,
      maxPrice: 50000,
      sortBy: "popular",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/products");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=12");
    expect(calledUrl).toContain("type=custom_order");
    expect(calledUrl).toContain("search=logo");
    expect(calledUrl).toContain("categoryId=507f1f77bcf86cd799439011");
    expect(calledUrl).toContain("vipOnly=true");
    expect(calledUrl).toContain("minPrice=10000");
    expect(calledUrl).toContain("maxPrice=50000");
    expect(calledUrl).toContain("sortBy=popular");
  });

  it("loads product detail by identifier", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(createEnvelope({ _id: "p1", slug: "sample-product" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getProductDetail("sample-product");

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/products/sample-product");
  });
});
