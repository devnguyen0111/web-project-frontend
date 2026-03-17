"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, Spinner } from "@/components/ui";
import { listMyPosts } from "@/lib/api/blog";
import { getMyProfile } from "@/lib/api/users";
import type { AuthUser, Post } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyProfile(), listMyPosts({ page: 1, limit: 8 })])
      .then(([profileData, postsData]) => {
        setProfile(profileData);
        setPosts(postsData.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
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

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading dashboard" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>My posts</CardTitle>
              <CardDescription>Latest 8 posts from /posts/me</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {posts.length === 0 ? (
                <p className="text-sm text-slate-500">No posts yet.</p>
              ) : (
                posts.map((post) => (
                  <div
                    key={post._id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
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
                ))
              )}
            </CardContent>
          </Card>

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
        </div>
      </section>
    </main>
  );
}
