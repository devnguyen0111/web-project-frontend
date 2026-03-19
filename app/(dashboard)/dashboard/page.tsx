"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, Spinner } from "@/components/ui";
import { listMyPosts } from "@/lib/api/blog";
import { getMyProfile } from "@/lib/api/users";
import type { AuthUser, Post } from "@/lib/types";

const PAGE_SIZE = 8;
const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function DashboardPage() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getMyProfile()
      .then((profileData) => {
        if (active) {
          setProfile(profileData);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setPostsLoading(true);
      setError("");

      try {
        const postsData = await listMyPosts({ page, limit: PAGE_SIZE });
        if (!active) {
          return;
        }

        setPosts(postsData.data);
        setPage(postsData.page);
        setPageInfo({
          total: postsData.total,
          totalPages: Math.max(1, postsData.totalPages),
        });
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load dashboard");
        setPosts([]);
        setPageInfo({ total: 0, totalPages: 1 });
      } finally {
        if (active) {
          setPostsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [page]);

  const isInitialLoading = profileLoading && postsLoading;

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_24%)]" />
        <MotionSection
          className="page-hero-shell grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center"
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
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">Dashboard</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Content workspace with a full-width command strip and constrained working panels
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Review posts, update profile details, and check quota or billing state from a single dashboard
                shell that keeps the core tools centered and readable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/dashboard/posts/new"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Create new post
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Update profile
              </Link>
              <Link
                href="/dashboard/wallet"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Wallet & payments
              </Link>
              <Link
                href="/settings/subscription"
                className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 font-semibold text-amber-50 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Subscription & quota
              </Link>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Role</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.role || "Loading..."}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Plan</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {profile?.subscription.planName || "Loading..."}
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Posts</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{pageInfo.total || posts.length || 0}</p>
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
              <CardTitle>Workspace shortcuts</CardTitle>
              <CardDescription>
                Common actions for content creation, account management, and billing.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/posts/new"
                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Create new post
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Update profile
              </Link>
              <Link
                href="/dashboard/wallet"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Wallet & payments
              </Link>
              <Link
                href="/settings/subscription"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Subscription & quota
              </Link>
            </CardContent>
          </Card>
        </MotionDiv>

        {isInitialLoading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading dashboard" />
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

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card className="surface-card">
              <CardHeader>
                <CardTitle>My posts</CardTitle>
                <CardDescription>
                  Page {page} of {pageInfo.totalPages} from /posts/me
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {postsLoading ? (
                  <div className="flex justify-center py-6">
                    <Spinner label="Loading my posts" />
                  </div>
                ) : null}

                {!postsLoading && posts.length === 0 ? (
                  <p className="text-sm text-slate-500">No posts yet.</p>
                ) : null}

                {!postsLoading
                  ? posts.map((post, index) => (
                      <MotionDiv
                        key={post._id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.28, delay: index * 0.05, ease: smoothEase }}
                      >
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{post.title}</p>
                            <Badge>{post.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Created: {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                          <div className="mt-2">
                            <Link
                              href={`/dashboard/posts/${post._id}/edit`}
                              className="text-xs font-semibold text-cyan-700 hover:text-cyan-600"
                            >
                              Edit post
                            </Link>
                          </div>
                        </div>
                      </MotionDiv>
                    ))
                  : null}

                {!postsLoading && !error ? (
                  <PaginationControls
                    page={page}
                    totalPages={pageInfo.totalPages}
                    totalItems={pageInfo.total}
                    itemLabel="posts"
                    onPageChange={setPage}
                  />
                ) : null}
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
          >
            <div className="space-y-6">
              <Card className="surface-card border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>Profile snapshot</CardTitle>
                  <CardDescription>Data from /users/me</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{profile?.fullName || "-"}</p>
                  <Separator />
                  <p>{profile?.email || "-"}</p>
                  <Badge className="w-fit">{profile?.role || "guest"}</Badge>
                </CardContent>
              </Card>

              <Card className="surface-card overflow-hidden border-amber-200 bg-[linear-gradient(160deg,rgba(255,251,235,0.95),rgba(255,255,255,1))]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Subscription snapshot</CardTitle>
                      <CardDescription>
                        Current plan, monthly post quota, and renewal window
                      </CardDescription>
                    </div>
                    <Badge className="w-fit bg-amber-500 text-white hover:bg-amber-500">
                      {profile?.subscription.planName ?? "Free"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-amber-200 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Allowed</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">
                        {profile?.postQuota.allowedPosts ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Used</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">
                        {profile?.postQuota.usedPosts ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Remaining</p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-900">
                        {profile?.postQuota.remainingPosts ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Billing:{" "}
                        <span className="font-semibold text-slate-950">
                          {profile?.subscription.currentPeriodStart
                            ? new Date(profile?.subscription.currentPeriodStart).toLocaleDateString()
                            : "-"}
                        </span>
                        {" "}to{" "}
                        <span className="font-semibold text-slate-950">
                          {profile?.subscription.currentPeriodEnd
                            ? new Date(profile?.subscription.currentPeriodEnd).toLocaleDateString()
                            : "-"}
                        </span>
                      </span>
                      <span
                        className={
                          profile?.postQuota.exhausted
                            ? "font-semibold text-rose-600"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        {profile?.postQuota.exhausted ? "Quota exhausted" : "Quota available"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/settings/subscription"
                    className="inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Manage subscription
                  </Link>
                </CardContent>
              </Card>
            </div>
          </MotionDiv>
        </div>
      </section>
    </main>
  );
}
