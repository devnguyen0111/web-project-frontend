import { afterEach, describe, expect, it, vi } from "vitest";
import { getPostBySlug } from "@/lib/api/blog";
import type { BlogPostDetailV2 } from "@/lib/types";

function createPostEnvelope(post: BlogPostDetailV2) {
  return new Response(JSON.stringify({ success: true, data: post }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("blog api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("dedupes in-flight getPostBySlug requests for the same slug", async () => {
    let resolveFetch!: (value: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn(() => pendingResponse);
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getPostBySlug("strict-mode-dedupe");
    const secondRequest = getPostBySlug("strict-mode-dedupe");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      createPostEnvelope({
        id: "post-1",
        title: "Strict mode dedupe",
        slug: "strict-mode-dedupe",
        flags: {
          isExclusive: false,
          isFeatured: false,
          isPinned: false,
        },
        author: {
          id: "author-1",
          fullName: "Author",
          level: 3,
        },
        metrics: {
          views: 10,
          likesCount: 1,
          commentsCount: 2,
          bookmarksCount: 0,
          readTimeMinutes: 1,
        },
        access: {
          locked: false,
          upgradeUrl: "/subscription",
        },
        blocks: [{ type: "paragraph", text: "content" }],
        toc: [],
      }),
    );

    const [firstResult, secondResult] = await Promise.all([
      firstRequest,
      secondRequest,
    ]);

    expect(firstResult).toEqual(secondResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
