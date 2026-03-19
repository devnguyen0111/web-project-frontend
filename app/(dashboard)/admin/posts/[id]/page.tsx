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
    if (!post) {
      return;
    }

    setActing(true);
    setError("");
    try {
      await approvePost(post._id);
      router.push("/staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
      setActing(false);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }

    setActing(true);
    setError("");

    try {
      await rejectPost(post._id, rejectReason.trim() || "Needs revision");
      router.push("/staff");
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
            href="/staff"
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
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_24%)]" />
        <MotionSection
          className="page-hero-shell grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
        >
          <MotionDiv
            className="space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04, ease: smoothEase }}
          >
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">Moderation</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Review a pending post without losing the larger moderation context
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                The detailed view keeps post content centered, while the banner highlights status, actions,
                and queue navigation across the full viewport width.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/staff"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Back to queue
              </Link>
              <Badge className="rounded-full border border-cyan-200/80 bg-white/85 px-4 py-2 text-slate-800">
                {post.status}
              </Badge>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Author</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{post.author?.fullName ?? post.authorId}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Created</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatDateTime(post.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Submitted</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatDateTime(post.submittedAt)}</p>
              </div>
            </div>
          </MotionDiv>
        </MotionSection>
      </section>

      <section className="content-shell page-stack py-10">
      <MotionSection
        className="page-stack"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card className="surface-card">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="w-fit">{post.status}</Badge>
                <Link
                  href="/staff"
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
      </section>
    </main>
  );
}
