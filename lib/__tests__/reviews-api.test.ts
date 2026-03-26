import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProductReview,
  createStoreReview,
  listProductReviews,
  listStoreReviews,
  replyReview,
} from "@/lib/api/reviews";

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

describe("reviews api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds product reviews query string", async () => {
    const fetchMock = createFetchMock({
      data: [],
      total: 0,
      page: 2,
      limit: 15,
      totalPages: 0,
    });

    await listProductReviews("product-1", { page: 2, limit: 15 });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/products/product-1/reviews");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=15");
  });

  it("posts product review payload", async () => {
    const fetchMock = createFetchMock({ _id: "r1" });

    await createProductReview("product-1", {
      rating: 5,
      qualityRating: 5,
      deliveryRating: 4,
      communicationRating: 5,
      content: "Great support and fast delivery",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(calledUrl).toContain("/products/product-1/reviews");
    expect(String(options.body)).toContain("Great support and fast delivery");
  });

  it("builds store reviews query string", async () => {
    const fetchMock = createFetchMock({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    await listStoreReviews({ page: 1, limit: 10 });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/store/reviews");
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("limit=10");
  });

  it("posts store review payload", async () => {
    const fetchMock = createFetchMock({ _id: "r2" });

    await createStoreReview({
      rating: 4,
      content: "Responsive and transparent process",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(calledUrl).toContain("/store/reviews");
    expect(String(options.body)).toContain("Responsive and transparent process");
  });

  it("patches staff reply payload", async () => {
    const fetchMock = createFetchMock({ _id: "r3" });

    await replyReview("r3", { message: "Thanks for the feedback." });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(calledUrl).toContain("/reviews/r3/reply");
    expect(String(options.body)).toContain("Thanks for the feedback.");
  });
});
