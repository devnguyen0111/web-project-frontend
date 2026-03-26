"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "@/components/ui";
import { listWikiArticles, listWikiCategories } from "@/lib/api/wiki";
import type { WikiArticle, WikiCategory } from "@/lib/types";

function getArticleId(article: WikiArticle) {
  return article.id ?? article._id;
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item._id, item.name]));
  }, [categories]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [categoryData, articleData] = await Promise.all([
          listWikiCategories(),
          listWikiArticles({
            page: 1,
            limit: 30,
            q: search.trim() || undefined,
            categoryId: categoryId || undefined,
          }),
        ]);
        if (!active) {
          return;
        }
        setCategories(categoryData);
        setArticles(articleData.data);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load knowledge base");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [categoryId, search]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(keyword);
  }

  return (
    <main className="pb-16 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Wiki</Badge>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>
              Search public documentation and open full article details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleSearch}>
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search title, excerpt, content..."
              />
              <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Articles</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${articles.length} article(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && articles.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No article matches your filter.</p>
            ) : null}
            {articles.map((article) => (
              <div
                key={getArticleId(article)}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{article.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {article.excerpt || "No excerpt available."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral">{categoryMap.get(article.categoryId ?? "") ?? "Uncategorized"}</Badge>
                      <Badge variant="neutral">views: {article.views ?? 0}</Badge>
                      <Badge variant="neutral">
                        helpful: {article.helpfulYes ?? 0}/{(article.helpfulYes ?? 0) + (article.helpfulNo ?? 0)}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/knowledge/${article.slug}`}>
                    <Button variant="secondary">Read</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
