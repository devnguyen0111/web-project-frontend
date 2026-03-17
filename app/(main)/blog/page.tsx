"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCategories, listPublishedPosts, listTags } from "@/lib/api/blog";
import type { Category, Post, Tag } from "@/lib/types";

export default function BlogListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPosts() {
    setLoading(true);
    setError("");

    try {
      const data = await listPublishedPosts({
        page: 1,
        limit: 20,
        search,
        categoryId,
        tagId,
      });
      setPosts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([listCategories(), listTags()])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch(() => {
        setCategories([]);
        setTags([]);
      })
      .finally(loadPosts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Published posts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connected to backend endpoint GET /posts with filters.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or content"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
          />

          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value="">All tags</option>
            {tags.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={loadPosts}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply filters
        </button>
      </section>

      {loading ? <p className="mt-6 text-slate-600">Loading posts...</p> : null}
      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post._id}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="mb-3 h-44 w-full rounded-lg object-cover"
              />
            ) : null}
            <p className="text-xs uppercase tracking-wide text-cyan-700">
              {post.status}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">
              {post.excerpt || post.content}
            </p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{post.views} views</span>
              <span>{post.likesCount} likes</span>
              <span>{post.commentsCount} comments</span>
            </div>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-4 inline-block rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Read detail
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
