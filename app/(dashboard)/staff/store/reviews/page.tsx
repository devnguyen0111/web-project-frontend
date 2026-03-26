"use client";

import { FormEvent, useEffect, useState } from "react";
import { StaffStoreNav } from "@/components/common/staff-store-nav";
import {
  listProductReviews,
  listStoreReviews,
  replyReview,
} from "@/lib/api/reviews";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import type { Review } from "@/lib/types";

function renderStars(rating: number) {
  const normalized = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"*".repeat(normalized)}${"-".repeat(5 - normalized)}`;
}

export default function StaffStoreReviewsPage() {
  const [storeReviews, setStoreReviews] = useState<Review[]>([]);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [productId, setProductId] = useState("");
  const [replyByReviewId, setReplyByReviewId] = useState<Record<string, string>>({});

  async function loadStoreReviews() {
    const result = await listStoreReviews({ page: 1, limit: 30 });
    setStoreReviews(result.data);
  }

  async function loadProductReviews(targetProductId: string) {
    const result = await listProductReviews(targetProductId, { page: 1, limit: 30 });
    setProductReviews(result.data);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadStoreReviews();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load store reviews");
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
  }, []);

  async function handleLoadProductReviews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId.trim()) {
      setError("Enter product ID first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await loadProductReviews(productId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product reviews");
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(reviewId: string) {
    const text = replyByReviewId[reviewId]?.trim() ?? "";
    if (!text) {
      setError("Reply message is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await replyReview(reviewId, { message: text });
      await Promise.all([
        loadStoreReviews(),
        productId.trim() ? loadProductReviews(productId.trim()) : Promise.resolve(),
      ]);
      setReplyByReviewId((prev) => ({ ...prev, [reviewId]: "" }));
      setMessage("Reply sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reply review");
    } finally {
      setSaving(false);
    }
  }

  function renderReviewCard(review: Review) {
    const reviewId = review.id ?? review._id;
    return (
      <div
        key={reviewId}
        className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{review.targetType}</Badge>
            <Badge variant="warning">{review.rating}/5</Badge>
            <Badge variant="neutral">{renderStars(review.rating)}</Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {new Date(review.createdAt).toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">reviewer: {review.reviewerId}</p>
        {review.content ? <p className="text-sm text-[var(--text-primary)]">{review.content}</p> : null}
        {review.aspects ? (
          <p className="text-xs text-[var(--text-secondary)]">
            Aspects: quality {review.aspects.quality ?? "-"} | delivery {review.aspects.delivery ?? "-"} |
            communication {review.aspects.communication ?? "-"}
          </p>
        ) : null}
        {review.staffReply ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-2 text-sm">
            <p className="font-semibold text-[var(--text-primary)]">Staff reply</p>
            <p className="text-[var(--text-secondary)]">{review.staffReply.message}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {new Date(review.staffReply.repliedAt).toLocaleString()}
            </p>
          </div>
        ) : null}
        <Textarea
          value={replyByReviewId[reviewId] ?? ""}
          onChange={(event) =>
            setReplyByReviewId((prev) => ({
              ...prev,
              [reviewId]: event.target.value,
            }))
          }
          maxLength={1000}
          placeholder="Reply as staff/admin"
        />
        <Button onClick={() => void handleReply(reviewId)} loading={saving}>
          Send reply
        </Button>
      </div>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Store Ops</Badge>
            <CardTitle>Reviews workspace</CardTitle>
            <CardDescription>
              Monitor product/store reviews and respond as staff/admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffStoreNav />
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}
        {message ? (
          <Card className="border-[var(--success)] bg-[var(--success-soft)]">
            <CardContent className="p-4 text-sm text-[var(--success)]">{message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Product reviews by ID</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-wrap items-end gap-3" onSubmit={handleLoadProductReviews}>
              <div className="min-w-[280px] flex-1 space-y-1.5">
                <Label htmlFor="productId">Product ID</Label>
                <Input
                  id="productId"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  placeholder="Mongo product ID"
                />
              </div>
              <Button type="submit" loading={loading}>
                Load product reviews
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Store reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading reviews...</p> : null}
            {!loading && storeReviews.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No store reviews yet.</p>
            ) : null}
            {storeReviews.map((review) => renderReviewCard(review))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && productReviews.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No product reviews loaded.</p>
            ) : null}
            {productReviews.map((review) => renderReviewCard(review))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
