import { afterEach, describe, expect, it, vi } from "vitest";
import { getPostBySlug } from "@/lib/api/blog";
import type { Post } from "@/lib/types";

function createPostEnvelope(post: Post) {
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
    let resolveFetch: ((value: Response) => void) | null = null;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn(() => pendingResponse);
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getPostBySlug("strict-mode-dedupe");
    const secondRequest = getPostBySlug("strict-mode-dedupe");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.(
      createPostEnvelope({
        _id: "post-1",
        authorId: "author-1",
        title: "Strict mode dedupe",
        slug: "strict-mode-dedupe",
        content: "content",
        tags: [],
        status: "published",
        views: 10,
        likesCount: 1,
        bookmarksCount: 0,
        commentsCount: 2,
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
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
