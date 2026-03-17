"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Spinner } from "@/components/ui";
import { listCategories, listPublishedPosts, listTags } from "@/lib/api/blog";
import { getPostPreviewText } from "@/lib/post-blocks";
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
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Published blog posts</CardTitle>
            <CardDescription>
              Filter by keyword, category, and tag. Data source is GET /posts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Title or block content keyword"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tag">Tag</Label>
                <Select id="tag" value={tagId} onChange={(event) => setTagId(event.target.value)}>
                  <option value="">All tags</option>
                  {tags.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button onClick={loadPosts} disabled={loading}>
              {loading ? "Applying filters..." : "Apply filters"}
            </Button>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading posts" />
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <Card key={post._id} className="overflow-hidden">
              {post.coverImageUrl ? (
                <div className="relative h-52 w-full">
                  <Image
                    src={post.coverImageUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  {post.status}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
                <p className="line-clamp-3 text-sm text-slate-600">
                  {getPostPreviewText(post)}
                </p>
                <p className="text-xs text-slate-500">
                  {post.views} views | {post.likesCount} likes | {post.commentsCount} comments
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Read detail
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
