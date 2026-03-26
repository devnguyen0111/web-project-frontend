"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getWikiArticleBySlug, voteWikiHelpful } from "@/lib/api/wiki";
import type { WikiArticle, WikiHelpfulVote } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

function getArticleId(article: WikiArticle | null) {
  if (!article) {
    return "";
  }
  return article.id ?? article._id;
}

export default function KnowledgeDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug ?? "");
  const { user } = useAuth();

  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalVotes = useMemo(
    () => (article ? (article.helpfulYes ?? 0) + (article.helpfulNo ?? 0) : 0),
    [article],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getWikiArticleBySlug(slug);
        if (active) {
          setArticle(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load article");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  async function handleVote(value: WikiHelpfulVote) {
    if (!article || !user) {
      setError("Sign in to submit helpful vote.");
      return;
    }

    setVoting(true);
    setError("");
    setMessage("");
    try {
      const response = await voteWikiHelpful(getArticleId(article), value);
      setArticle((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          helpfulYes: response.helpfulYes,
          helpfulNo: response.helpfulNo,
        };
      });
      setMessage("Thanks for your feedback.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <main className="pb-16 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">Loading article...</CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="pb-16 pt-10">
        <section className="section-shell space-y-4">
          <Card>
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error || "Article not found."}</CardContent>
          </Card>
          <Link href="/knowledge">
            <Button variant="secondary">Back to knowledge</Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-16 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge className="w-fit">Knowledge article</Badge>
                <CardTitle>{article.title}</CardTitle>
                <CardDescription>
                  Updated: {article.updatedAt ? new Date(article.updatedAt).toLocaleString() : "-"}
                </CardDescription>
              </div>
              <Link href="/knowledge">
                <Button variant="secondary">Back to knowledge</Button>
              </Link>
            </div>
            {article.breadcrumb?.length ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                {article.breadcrumb.map((item) => (
                  <Link key={`${item.articleId}-${item.slug}`} href={`/knowledge/${item.slug}`} className="underline">
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {article.excerpt ? (
              <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]">
                {article.excerpt}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">views: {article.views ?? 0}</Badge>
              <Badge variant="neutral">helpful: {article.helpfulYes ?? 0}</Badge>
              <Badge variant="neutral">not helpful: {article.helpfulNo ?? 0}</Badge>
            </div>
            <article className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--text-primary)]">
              {article.content}
            </article>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Was this article helpful?</CardTitle>
            <CardDescription>
              {totalVotes} vote(s) so far.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void handleVote("yes")} loading={voting} disabled={!user}>
              Yes
            </Button>
            <Button variant="secondary" onClick={() => void handleVote("no")} loading={voting} disabled={!user}>
              No
            </Button>
            {!user ? (
              <p className="text-xs text-[var(--text-secondary)]">Sign in to vote.</p>
            ) : null}
          </CardContent>
        </Card>

        {message ? (
          <Card className="border-[var(--success)] bg-[var(--success-soft)]">
            <CardContent className="p-4 text-sm text-[var(--success)]">{message}</CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
