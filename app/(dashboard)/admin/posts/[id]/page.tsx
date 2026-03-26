"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PostBlockRenderer } from "@/components/blog/PostBlockRenderer";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Spinner } from "@/components/ui";
import { approvePost, getPendingPostDetail, rejectPost } from "@/lib/api/blog";
import { getPostPreviewText } from "@/lib/post-blocks";
import type { Post } from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "-";
  }

  return timestamp.toLocaleString();
}

export default function AdminPendingPostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = useMemo(() => params?.id ?? "", [params]);

  const [post, setPost] = useState<Post | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  async function loadPostDetail() {
    if (!postId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getPendingPostDetail(postId);
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post detail");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!post || acting) {
      return;
    }

    setActing(true);
    setError("");
    try {
      await approvePost(post._id);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
      setActing(false);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post || acting) {
      return;
    }

    setActing(true);
    setError("");

    try {
      await rejectPost(post._id, rejectReason.trim() || "Needs revision");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
      setActing(false);
    }
  }

  useEffect(() => {
    void loadPostDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading pending post detail" />
      </main>
    );
  }

  if (error && !post) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell space-y-4">
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to moderation queue
          </Link>
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="p-4 text-sm text-slate-600">Post not found</CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="w-fit">{post.status}</Badge>
                <Link
                  href="/admin"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to queue
                </Link>
              </div>
              <CardTitle className="text-2xl">{post.title}</CardTitle>
              <CardDescription>{getPostPreviewText(post, 260)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Author: {post.author?.fullName ?? post.authorId}</p>
              <p>Created: {formatDateTime(post.createdAt)}</p>
              <p>Submitted: {formatDateTime(post.submittedAt)}</p>
              {post.poll ? (
                <p>
                  Poll: {post.poll.question} ({post.poll.options.length} options)
                </p>
              ) : null}
            </CardContent>
          </Card>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Post content</CardTitle>
            </CardHeader>
            <CardContent>
              <PostBlockRenderer blocks={post.blocks ?? []} />
            </CardContent>
          </Card>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Moderation actions</CardTitle>
              <CardDescription>Approve or reject from detailed view</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={handleApprove} disabled={acting}>
                  {acting ? "Processing..." : "Approve"}
                </Button>
              </div>
              <form onSubmit={handleReject} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Reject reason"
                  disabled={acting}
                />
                <Button type="submit" variant="destructive" disabled={acting}>
                  {acting ? "Processing..." : "Reject"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionSection>
    </main>
  );
}
