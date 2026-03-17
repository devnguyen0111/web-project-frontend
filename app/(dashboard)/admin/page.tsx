"use client";

import { FormEvent, useEffect, useState } from "react";
import { approvePost, listPendingPosts, rejectPost } from "@/lib/api/blog";
import type { Post } from "@/lib/types";

export default function AdminModerationPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reasonByPost, setReasonByPost] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPending() {
    setLoading(true);
    setError("");

    try {
      const result = await listPendingPosts(1, 20);
      setPosts(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load moderation queue",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approvePost(id);
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();

    const reason = reasonByPost[id] || "Needs revision";
    try {
      await rejectPost(id, reason);
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Moderation queue</h1>
      <p className="mt-2 text-sm text-slate-600">
        For staff/admin roles. Calls GET/PATCH moderation endpoints.
      </p>

      {loading ? (
        <p className="mt-4 text-slate-600">Loading pending posts...</p>
      ) : null}
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      <section className="mt-6 space-y-4">
        {posts.map((post) => (
          <article
            key={post._id}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            <h2 className="text-xl font-semibold text-slate-900">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-slate-700">
              {post.content}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleApprove(post._id)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Approve
              </button>

              <form
                onSubmit={(event) => handleReject(event, post._id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  value={reasonByPost[post._id] || ""}
                  onChange={(event) =>
                    setReasonByPost((prev) => ({
                      ...prev,
                      [post._id]: event.target.value,
                    }))
                  }
                  placeholder="Reject reason"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
