"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Spinner } from "@/components/ui";
import { approvePost, deletePost, listPendingPosts, listPublishedPosts, rejectPost } from "@/lib/api/blog";
import { getPostPreviewText } from "@/lib/post-blocks";
import type { Post } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 10;
const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function StaffModerationPage() {
  const { user } = useAuth();
  const canManageUsers = user?.role === "admin";
  const canManageTaxonomy = user?.role === "staff" || user?.role === "admin";
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<Post[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [pendingInfo, setPendingInfo] = useState({ total: 0, totalPages: 1 });
  const [approvedInfo, setApprovedInfo] = useState({ total: 0, totalPages: 1 });
  const [reasonByPost, setReasonByPost] = useState<Record<string, string>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadModerationData = useCallback(
    async (nextPendingPage = pendingPage, nextApprovedPage = approvedPage) => {
      setLoading(true);
      setError("");

      try {
        const [pendingResult, publishedResult] = await Promise.all([
          listPendingPosts(nextPendingPage, PAGE_SIZE),
          listPublishedPosts({ page: nextApprovedPage, limit: PAGE_SIZE }),
        ]);

        setPendingPosts(pendingResult.data);
        setPendingPage(pendingResult.page);
        setPendingInfo({
          total: pendingResult.total,
          totalPages: Math.max(1, pendingResult.totalPages),
        });

        setApprovedPosts(publishedResult.data);
        setApprovedPage(publishedResult.page);
        setApprovedInfo({
          total: publishedResult.total,
          totalPages: Math.max(1, publishedResult.totalPages),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load moderation data");
        setPendingPosts([]);
        setApprovedPosts([]);
        setPendingInfo({ total: 0, totalPages: 1 });
        setApprovedInfo({ total: 0, totalPages: 1 });
      } finally {
        setLoading(false);
      }
    },
    [approvedPage, pendingPage],
  );

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
  }, [loadModerationData]);

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_24%)]" />
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
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">Staff</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Moderation workspace for review queue execution and follow-up actions
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Staff handles the review queue while admin remains available for higher-level control. The
                routing keeps decision tools on a full-width banner and the queues in constrained panels.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {canManageTaxonomy ? (
                <Link
                  href="/staff/taxonomy"
                  className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Category & tag workspace
                </Link>
              ) : null}
              {canManageUsers ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Admin center
                </Link>
              ) : null}
              {canManageUsers ? (
                <Link
                  href="/admin/users"
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  User management
                </Link>
              ) : null}
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Mode</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Moderation</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Scope</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{canManageTaxonomy ? "Staff + taxonomy" : "Queue review"}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Visibility</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{canManageUsers ? "Staff + admin" : "Staff only"}</p>
              </div>
            </div>
          </MotionDiv>
        </MotionSection>
      </section>

      <section className="content-shell page-stack py-10">
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card className="surface-card">
            <CardHeader>
              <CardTitle>Moderation workspace</CardTitle>
              <CardDescription>
                Staff handles review queue. Admin has a separate control center.
              </CardDescription>
            </CardHeader>
            {canManageUsers || canManageTaxonomy ? (
              <CardContent className="flex flex-wrap gap-2 pt-0">
                {canManageTaxonomy ? (
                  <Link
                    href="/staff/taxonomy"
                    className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Category & tag workspace
                  </Link>
                ) : null}
                {canManageUsers ? (
                  <Link
                    href="/admin"
                    className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Admin center
                  </Link>
                ) : null}
                {canManageUsers ? (
                  <Link
                    href="/admin/users"
                    className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    User management
                  </Link>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        </MotionDiv>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading moderation data" />
          </div>
        ) : null}

        {error ? (
          <MotionDiv
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: smoothEase }}
          >
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
            </Card>
          </MotionDiv>
        ) : null}

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pending</h2>
              <p className="text-sm text-slate-500">Review queue from moderation API.</p>
            </div>
            {!error ? (
              <PaginationControls
                page={pendingPage}
                totalPages={pendingInfo.totalPages}
                totalItems={pendingInfo.total}
                itemLabel="pending posts"
                onPageChange={setPendingPage}
                disabled={loading}
                className="w-full sm:w-auto sm:min-w-[320px]"
              />
            ) : null}
          </div>

          {!loading && pendingPosts.length === 0 ? (
            <Card className="surface-card">
              <CardContent className="p-4 text-sm text-slate-500">No pending posts.</CardContent>
            </Card>
          ) : null}

          {pendingPosts.map((post, index) => (
            <MotionDiv
              key={post._id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: smoothEase }}
            >
              <Card className="surface-card">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <Badge>{post.status}</Badge>
                  </div>
                  <CardDescription className="line-clamp-3">{getPostPreviewText(post)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Link
                    href={`/staff/posts/${post._id}`}
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
            </MotionDiv>
          ))}
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <Card className="surface-card">
            <CardHeader>
              <Badge className="w-fit">Approved</Badge>
              <CardTitle>Published posts</CardTitle>
              <CardDescription>
                Staff can delete approved posts. Admin can delete any published post.
              </CardDescription>
            </CardHeader>
          </Card>
        </MotionDiv>

        <div className="space-y-4">
          {!error ? (
            <PaginationControls
              page={approvedPage}
              totalPages={approvedInfo.totalPages}
              totalItems={approvedInfo.total}
              itemLabel="published posts"
              onPageChange={setApprovedPage}
              disabled={loading}
            />
          ) : null}

          {!loading && approvedPosts.length === 0 ? (
            <Card className="surface-card">
              <CardContent className="p-4 text-sm text-slate-500">No approved posts.</CardContent>
            </Card>
          ) : null}

          {approvedPosts.map((post, index) => (
            <MotionDiv
              key={post._id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: smoothEase }}
            >
              <Card className="surface-card">
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
            </MotionDiv>
          ))}
        </div>
      </section>
    </main>
  );
}
