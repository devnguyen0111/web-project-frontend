"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Spinner } from "@/components/ui";
import { approvePost, deletePost, listPendingPosts, listPublishedPosts, rejectPost } from "@/lib/api/blog";
import { getPostPreviewText } from "@/lib/post-blocks";
import type { Post } from "@/lib/types";

export default function AdminModerationPage() {
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<Post[]>([]);
  const [reasonByPost, setReasonByPost] = useState<Record<string, string>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadModerationData() {
    setLoading(true);
    setError("");

    try {
      const [pendingResult, publishedResult] = await Promise.all([
        listPendingPosts(1, 20),
        listPublishedPosts({ page: 1, limit: 20 }),
      ]);

      setPendingPosts(pendingResult.data);
      setApprovedPosts(publishedResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approvePost(id);
      await loadModerationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const reason = reasonByPost[id] || "Needs revision";

    try {
      await rejectPost(id, reason);
      await loadModerationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  async function handleDeleteApproved(id: string) {
    if (!window.confirm("Delete this approved post?")) {
      return;
    }

    setDeletingPostId(id);
    setError("");

    try {
      await deletePost(id);
      await loadModerationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingPostId(null);
    }
  }

  useEffect(() => {
    void loadModerationData();
  }, []);

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Moderation</Badge>
            <CardTitle>Pending post review</CardTitle>
            <CardDescription>
              Staff and admins can approve or reject content from moderation queue.
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading pending posts" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {pendingPosts.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-slate-500">No pending posts.</CardContent>
            </Card>
          ) : null}

          {pendingPosts.map((post) => (
            <Card key={post._id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <Badge>{post.status}</Badge>
                </div>
                <CardDescription className="line-clamp-3">{getPostPreviewText(post)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
                <Link
                  href={`/admin/posts/${post._id}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View detail
                </Link>
                <Button variant="secondary" onClick={() => handleApprove(post._id)}>
                  Approve
                </Button>
                <form
                  onSubmit={(event) => handleReject(event, post._id)}
                  className="flex flex-1 flex-col gap-2 sm:flex-row"
                >
                  <Input
                    value={reasonByPost[post._id] || ""}
                    onChange={(event) =>
                      setReasonByPost((prev) => ({ ...prev, [post._id]: event.target.value }))
                    }
                    placeholder="Reject reason"
                  />
                  <Button type="submit" variant="destructive">
                    Reject
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Badge className="w-fit">Approved</Badge>
            <CardTitle>Published posts</CardTitle>
            <CardDescription>
              Staff can delete approved posts. Admin can delete any published post.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {approvedPosts.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-slate-500">No approved posts.</CardContent>
            </Card>
          ) : null}

          {approvedPosts.map((post) => (
            <Card key={post._id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <Badge>{post.status}</Badge>
                </div>
                <CardDescription className="line-clamp-3">{getPostPreviewText(post)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteApproved(post._id)}
                  disabled={deletingPostId === post._id}
                >
                  {deletingPostId === post._id ? "Deleting..." : "Delete post"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
