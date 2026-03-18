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
            <Card>
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
          </MotionDiv>
        </div>
      </MotionSection>
    </main>
  );
}
