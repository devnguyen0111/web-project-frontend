"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyPosts } from "@/lib/api/blog";
import { getMyProfile } from "@/lib/api/users";
import type { AuthUser, Post } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyProfile(), listMyPosts({ page: 1, limit: 8 })])
      .then(([profileData, postsData]) => {
        setProfile(profileData);
        setPosts(postsData.data);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      });
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Connected to /users/me and /posts/me.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-black/10 bg-white p-5 md:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">My posts</h2>
          <div className="mt-3 space-y-3">
            {posts.map((post) => (
              <div
                key={post._id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {post.title}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-cyan-700">
                  {post.status}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/posts/new"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Create new post
          </Link>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
          {profile ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>{profile.fullName}</p>
              <p>{profile.email}</p>
              <p className="uppercase text-cyan-700">{profile.role}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not loaded</p>
          )}
          <Link
            href="/dashboard/profile"
            className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Edit profile
          </Link>
        </article>
      </section>
    </main>
  );
}
