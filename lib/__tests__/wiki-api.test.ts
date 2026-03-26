import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getWikiArticleBySlug,
  listWikiArticles,
  listWikiCategories,
  voteWikiHelpful,
} from "@/lib/api/wiki";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("wiki api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds list query with search and category filter", async () => {
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

    await listWikiArticles({
      page: 1,
      limit: 20,
      q: "payment",
      categoryId: "507f1f77bcf86cd799439011",
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/wiki");
    expect(calledUrl).toContain("q=payment");
    expect(calledUrl).toContain("categoryId=507f1f77bcf86cd799439011");
  });

  it("calls categories, detail and helpful vote endpoints", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createEnvelope({
          _id: "article-1",
          slug: "how-to-refund",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listWikiCategories();
    await getWikiArticleBySlug("how-to-refund");
    await voteWikiHelpful("article-1", "yes");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/wiki/categories");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/wiki/how-to-refund");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/wiki/article-1/helpful");
  });
});
