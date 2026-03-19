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
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Dashboard</Badge>
              <CardTitle>Content workspace</CardTitle>
              <CardDescription>
                Review your posts, update profile details, and create new drafts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/posts/new"
                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-400"
              >
                Create new post
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Update profile
              </Link>
              <Link
                href="/dashboard/wallet"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Wallet & payments
              </Link>
              <Link
                href="/settings/subscription"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
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
            <Card>
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
              <Card className="border-slate-200 bg-white">
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

              <Card className="overflow-hidden border-amber-200 bg-[linear-gradient(160deg,rgba(255,251,235,0.95),rgba(255,255,255,1))]">
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
                    className="inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Manage subscription
                  </Link>
                </CardContent>
              </Card>
            </div>
          </MotionDiv>
        </div>
      </MotionSection>
    </main>
  );
}
