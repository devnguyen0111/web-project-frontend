"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Spinner } from "@/components/ui";
import { listCategories, listPublishedPosts, listTags } from "@/lib/api/blog";
import { getPostPreviewText } from "@/lib/post-blocks";
import type { Category, Post, Tag } from "@/lib/types";

const PAGE_SIZE = 12;
const smoothEase = [0.22, 1, 0.36, 1] as const;

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export default function BlogListPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      categoryId: searchParams.get("categoryId") ?? "",
      tagId: searchParams.get("tagId") ?? "",
      page: parsePage(searchParams.get("page")),
    }),
    [searchParams],
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState(appliedFilters.search);
  const [categoryId, setCategoryId] = useState(appliedFilters.categoryId);
  const [tagId, setTagId] = useState(appliedFilters.tagId);
  const [pageInfo, setPageInfo] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(appliedFilters.search);
    setCategoryId(appliedFilters.categoryId);
    setTagId(appliedFilters.tagId);
  }, [appliedFilters.categoryId, appliedFilters.search, appliedFilters.tagId]);

  useEffect(() => {
    Promise.all([listCategories(), listTags()])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch(() => {
        setCategories([]);
        setTags([]);
      });
  }, []);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        const data = await listPublishedPosts({
          page: appliedFilters.page,
          limit: PAGE_SIZE,
          search: appliedFilters.search,
          categoryId: appliedFilters.categoryId,
          tagId: appliedFilters.tagId,
        });

        setPosts(data.data);
        setPageInfo({
          page: data.page,
          total: data.total,
          totalPages: Math.max(1, data.totalPages),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch posts");
        setPosts([]);
        setPageInfo({ page: appliedFilters.page, total: 0, totalPages: 1 });
      } finally {
        setLoading(false);
      }
    }

    void loadPosts();
  }, [appliedFilters]);

  function updateQuery(next: {
    page?: number;
    search?: string;
    categoryId?: string;
    tagId?: string;
  }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? appliedFilters.search;
    const nextCategoryId = next.categoryId ?? appliedFilters.categoryId;
    const nextTagId = next.tagId ?? appliedFilters.tagId;
    const nextPage = Math.max(1, next.page ?? appliedFilters.page);

    if (nextSearch) {
      params.set("search", nextSearch);
    }
    if (nextCategoryId) {
      params.set("categoryId", nextCategoryId);
    }
    if (nextTagId) {
      params.set("tagId", nextTagId);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleApplyFilters() {
    updateQuery({
      page: 1,
      search,
      categoryId,
      tagId,
    });
  }

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

              <Button onClick={handleApplyFilters} disabled={loading}>
                {loading ? "Applying filters..." : "Apply filters"}
              </Button>
            </CardContent>
          </Card>
        </MotionDiv>

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

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading posts" />
          </div>
        ) : null}

        {!loading && !error ? (
          <PaginationControls
            page={pageInfo.page}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.total}
            itemLabel="posts"
            onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          />
        ) : null}

        {!loading && posts.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-500">
              No published posts matched the current filters.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {posts.map((post, index) => (
            <MotionDiv
              key={post._id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: smoothEase }}
            >
              <Card className="flex h-full flex-col overflow-hidden">
                <div className="relative h-52 w-full bg-slate-100">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      No cover image
                    </div>
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col space-y-3 p-5">
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
                    className="mt-auto inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Read detail
                  </Link>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </MotionSection>
    </main>
  );
}
