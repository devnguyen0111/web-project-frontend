"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Crown,
  ShieldCheck,
  ShoppingCart,
  Star,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  Textarea,
} from "@/components/ui";
import { addCartItem } from "@/lib/api/cart";
import { createOrder } from "@/lib/api/orders";
import { getStoreProduct, listStoreProducts } from "@/lib/api/products";
import { createProductReview, listProductReviews } from "@/lib/api/reviews";
import { createIdempotencyKey } from "@/lib/idempotency";
import {
  formatCoinLabel,
  formatFileSize,
  formatFileType,
  getUserStoreDiscountPercent,
  isVipActive,
  resolveStorePriceDisplay,
} from "@/lib/format/store-pricing";
import type { Order, Review, StoreProduct } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

function RatingStars({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < normalized;
        return (
          <Star
            key={`rating-star-${index}`}
            className={`h-4 w-4 ${
              active
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
}

function ProductTypeBadge({ type }: { type: StoreProduct["type"] }) {
  if (type === "digital") {
    return (
      <span className="rounded-full bg-sky-600/90 px-2 py-1 text-[11px] font-semibold text-white">
        Digital
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/90 px-2 py-1 text-[11px] font-semibold text-white">
      Custom Order
    </span>
  );
}

function getOrderId(order: Order | null) {
  return order?.id ?? order?._id ?? "";
}

function sanitizeCustomData(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return value !== undefined && value !== null;
    }),
  );
}

function RelatedProductCard({
  product,
  discountPercent,
}: {
  product: StoreProduct;
  discountPercent: number;
}) {
  const pricing = resolveStorePriceDisplay(product, discountPercent);

  return (
    <Link
      href={`/store/${product.slug}`}
      className="surface-card min-w-[220px] flex-1 overflow-hidden p-3 md:min-w-0"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <ProductTypeBadge type={product.type} />
        {product.vipOnly ? (
          <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">
            VIP Only
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
        {product.name}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
        {formatCoinLabel(pricing.finalCoins)} coin
      </p>
      {pricing.hasDiscount ? (
        <p className="text-xs text-[var(--text-muted)]">
          <span className="line-through">{formatCoinLabel(pricing.baseCoins)} coin</span>{" "}
          <span className="font-semibold text-emerald-600">-{pricing.appliedDiscountPercent}%</span>
        </p>
      ) : null}
    </Link>
  );
}

export default function StoreProductDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug?: string | string[] }>();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? (slugParam[0] ?? "") : (slugParam ?? "");

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [timeline, setTimeline] = useState("");
  const [referenceLink, setReferenceLink] = useState("");

  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewQuality, setReviewQuality] = useState(5);
  const [reviewDelivery, setReviewDelivery] = useState(5);
  const [reviewCommunication, setReviewCommunication] = useState(5);
  const [reviewContent, setReviewContent] = useState("");

  const vipActive = isVipActive(user);
  const discountPercent = getUserStoreDiscountPercent(user);
  const pricing = useMemo(
    () => (product ? resolveStorePriceDisplay(product, discountPercent) : null),
    [discountPercent, product],
  );

  const isDigital = product?.type === "digital";
  const lockedByVip = Boolean(product?.vipOnly) && !vipActive;
  const outOfStock = typeof product?.stock === "number" && product.stock <= 0;

  async function loadProductReviews(productId: string) {
    setReviewsLoading(true);
    setReviewError("");
    try {
      const response = await listProductReviews(productId, { page: 1, limit: 20 });
      setReviews(response.data);
    } catch (loadError) {
      setReviewError(
        loadError instanceof Error ? loadError.message : "Failed to load reviews",
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function loadRelatedProducts(currentProduct: StoreProduct) {
    const unique = new Map<string, StoreProduct>();

    if (currentProduct.categoryId) {
      const categoryResult = await listStoreProducts({
        page: 1,
        limit: 8,
        categoryId: currentProduct.categoryId,
        sortBy: "popular",
      });

      for (const item of categoryResult.data) {
        if (item._id !== currentProduct._id) {
          unique.set(item._id, item);
        }
      }
    }

    if (unique.size < 4) {
      const fallback = await listStoreProducts({
        page: 1,
        limit: 8,
        type: currentProduct.type,
        sortBy: "popular",
      });

      for (const item of fallback.data) {
        if (item._id !== currentProduct._id) {
          unique.set(item._id, item);
        }
      }
    }

    setRelatedProducts(Array.from(unique.values()).slice(0, 4));
  }

  useEffect(() => {
    let mounted = true;

    if (!slug) {
      setLoading(false);
      setError("Missing product slug");
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const currentProduct = await getStoreProduct(slug);
        if (!mounted) {
          return;
        }

        setProduct(currentProduct);
        setQuantity(1);

        await Promise.allSettled([
          loadProductReviews(currentProduct._id),
          loadRelatedProducts(currentProduct),
        ]);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load product",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  function ensureCanPurchase() {
    if (!product) {
      return false;
    }

    if (!user) {
      router.push("/login");
      return false;
    }

    if (lockedByVip) {
      setError("This product requires an active VIP account to purchase.");
      return false;
    }

    return true;
  }

  async function handleBuyNow() {
    if (!product || !isDigital || !ensureCanPurchase()) {
      return;
    }

    setBuyLoading(true);
    setError("");

    try {
      const created = await createOrder({
        productId: product._id,
        quantity: Math.max(1, Math.floor(quantity)),
        idempotencyKey: createIdempotencyKey("buy-now"),
      });

      router.push(`/dashboard/orders/${getOrderId(created)}`);
    } catch (buyError) {
      setError(buyError instanceof Error ? buyError.message : "Buy now failed");
    } finally {
      setBuyLoading(false);
    }
  }

  async function handleAddToCart() {
    if (!product || !isDigital || !ensureCanPurchase()) {
      return;
    }

    setCartLoading(true);
    setError("");

    try {
      await addCartItem({
        productId: product._id,
        quantity: Math.max(1, Math.floor(quantity)),
      });
      router.push("/cart");
    } catch (cartError) {
      setError(cartError instanceof Error ? cartError.message : "Failed to add to cart");
    } finally {
      setCartLoading(false);
    }
  }

  async function handleCustomRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || product.type !== "custom_order" || !ensureCanPurchase()) {
      return;
    }

    setRequestLoading(true);
    setError("");
    setRequestMessage("");

    try {
      const customData = sanitizeCustomData({
        requirements: requirements.trim(),
        timeline: timeline.trim(),
        referenceLink: referenceLink.trim(),
      });

      const created = await createOrder({
        productId: product._id,
        quantity: 1,
        customData,
        idempotencyKey: createIdempotencyKey("custom-order"),
      });

      setRequestMessage("Quote request sent. Redirecting to the order page.");
      router.push(`/dashboard/orders/${getOrderId(created)}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to send quote request",
      );
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    setReviewMessage("");

    try {
      await createProductReview(product._id, {
        rating: reviewRating,
        qualityRating: reviewQuality,
        deliveryRating: reviewDelivery,
        communicationRating: reviewCommunication,
        content: reviewContent.trim() || undefined,
      });

      await loadProductReviews(product._id);
      setReviewContent("");
      setReviewMessage("Review submitted.");
    } catch (submitError) {
      setReviewError(
        submitError instanceof Error ? submitError.message : "Failed to submit review",
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading product details" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="section-shell py-12">
        <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
          <CardContent className="p-4 text-sm text-[var(--danger)]">
            {error || "Product not found"}
          </CardContent>
        </Card>
      </main>
    );
  }

  const metrics = product.metrics;
  const averageRating = metrics?.averageRating ?? 0;
  const reviewCount = metrics?.reviewCount ?? 0;
  const soldCount = metrics?.soldCount ?? 0;

  return (
    <main className="pb-14 pt-8">
      <section className="section-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Store
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type={product.type} />
            {product.vipOnly ? (
              <span className="rounded-full bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white">
                VIP Only
              </span>
            ) : null}
          </div>
        </div>

        {!vipActive ? (
          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-start gap-2">
                <Crown className="mt-0.5 h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-violet-900">
                    Upgrade to VIP for 10% off and more benefits
                  </p>
                  <p className="text-sm text-violet-700">
                    Unlock all VIP-only products and get priority support.
                  </p>
                </div>
              </div>
              <Link href="/subscription">
                <Button className="bg-violet-600 hover:bg-violet-700">Upgrade now</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-[radial-gradient(circle_at_10%_20%,rgba(14,116,144,0.24),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.18),transparent_45%),linear-gradient(145deg,#f8fafc,#e2e8f0)] p-6 md:p-8">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {product.slug}
                      </p>
                      <h1 className="mt-2 max-w-3xl text-2xl font-semibold text-[var(--text-primary)] md:text-4xl">
                        {product.name}
                      </h1>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
                        {product.description || "This product has no detailed description yet."}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/85 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Sold</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{soldCount}</p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/85 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Rating</p>
                        <div className="mt-1 flex items-center gap-2">
                          <RatingStars value={averageRating} />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {averageRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/85 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Reviews</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{reviewCount}</p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/85 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">File info</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                          {isDigital
                            ? `${formatFileType(product.digitalAsset?.mimeType, product.digitalAsset?.fileName)} | ${formatFileSize(product.digitalAsset?.size)}`
                            : "Custom quote"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product reviews</CardTitle>
                <CardDescription>
                  Total {reviewCount} reviews, with a verified purchase badge shown for customers who bought it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewsLoading ? (
                  <p className="text-sm text-[var(--text-secondary)]">Loading reviews...</p>
                ) : null}

                {!reviewsLoading && reviews.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No reviews yet.</p>
                ) : null}

                {reviews.map((review) => (
                  <article
                    key={review.id ?? review._id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">{review.rating}/5</Badge>
                        {review.verifiedPurchase ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Verified purchase
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(review.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {review.content ? (
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{review.content}</p>
                    ) : null}

                    {review.aspects ? (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        Quality {review.aspects.quality ?? "-"} | Delivery {review.aspects.delivery ?? "-"} | Communication {review.aspects.communication ?? "-"}
                      </p>
                    ) : null}

                    {review.staffReply ? (
                      <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-2 text-sm">
                        <p className="font-semibold text-[var(--text-primary)]">Staff reply</p>
                        <p className="text-[var(--text-secondary)]">{review.staffReply.message}</p>
                      </div>
                    ) : null}
                  </article>
                ))}

                <form
                  className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-3"
                  onSubmit={handleSubmitReview}
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Write a review</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="review-rating">Rating</Label>
                      <Input
                        id="review-rating"
                        type="number"
                        min={1}
                        max={5}
                        value={reviewRating}
                        onChange={(event) => setReviewRating(Number(event.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-quality">Quality</Label>
                      <Input
                        id="review-quality"
                        type="number"
                        min={1}
                        max={5}
                        value={reviewQuality}
                        onChange={(event) => setReviewQuality(Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-delivery">Delivery</Label>
                      <Input
                        id="review-delivery"
                        type="number"
                        min={1}
                        max={5}
                        value={reviewDelivery}
                        onChange={(event) => setReviewDelivery(Number(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="review-communication">Communication</Label>
                      <Input
                        id="review-communication"
                        type="number"
                        min={1}
                        max={5}
                        value={reviewCommunication}
                        onChange={(event) => setReviewCommunication(Number(event.target.value))}
                      />
                    </div>
                  </div>

                  <Textarea
                    value={reviewContent}
                    onChange={(event) => setReviewContent(event.target.value)}
                    maxLength={2000}
                    placeholder="Share your experience"
                  />

                  {reviewError ? <p className="text-sm text-[var(--danger)]">{reviewError}</p> : null}
                  {reviewMessage ? <p className="text-sm text-[var(--success)]">{reviewMessage}</p> : null}

                  <Button type="submit" loading={reviewSubmitting}>
                    Submit review
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <aside>
            <Card className="sticky top-[92px]">
              <CardHeader>
                <CardTitle>{isDigital ? "Buy now" : "Request a quote"}</CardTitle>
                <CardDescription>
                  {isDigital
                    ? "Pay with coins instantly for this digital product."
                    : "Send a custom request so staff can provide a detailed quote."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">List price</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {pricing ? formatCoinLabel(pricing.finalCoins) : "-"} coin
                  </p>
                  {pricing?.hasDiscount ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      <span className="line-through">{formatCoinLabel(pricing.baseCoins)} coin</span>{" "}
                      <span className="font-semibold text-emerald-600">-{pricing.appliedDiscountPercent}%</span>
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">Trust signals</p>
                  <p>Sold: {soldCount}</p>
                  <p>
                    Average rating: {averageRating.toFixed(1)} ({reviewCount} reviews)
                  </p>
                  <p className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />
                    Verified purchase badge on reviews
                  </p>
                  {vipActive ? (
                    <p className="font-semibold text-violet-700">24-hour priority support for VIP members</p>
                  ) : null}
                </div>

                {isDigital ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="buy-quantity">Quantity</Label>
                      <Input
                        id="buy-quantity"
                        type="number"
                        min={1}
                        max={typeof product.stock === "number" ? product.stock : undefined}
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                        disabled={outOfStock || lockedByVip}
                      />
                    </div>

                    <Button
                      onClick={handleBuyNow}
                      loading={buyLoading}
                      disabled={outOfStock || lockedByVip}
                      className="w-full"
                    >
                      Buy now with coins
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleAddToCart}
                      loading={cartLoading}
                      disabled={outOfStock || lockedByVip}
                      className="w-full"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to cart
                    </Button>
                    {outOfStock ? (
                      <p className="text-xs text-[var(--danger)]">This product is out of stock.</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant="secondary"
                      onClick={() => setRequestOpen((prev) => !prev)}
                      disabled={lockedByVip}
                      className="w-full"
                    >
                      Request a quote
                    </Button>

                    {requestOpen ? (
                      <form className="space-y-3" onSubmit={handleCustomRequest}>
                        <div className="space-y-1.5">
                          <Label htmlFor="custom-requirements">Requirements</Label>
                          <Textarea
                            id="custom-requirements"
                            value={requirements}
                            onChange={(event) => setRequirements(event.target.value)}
                            placeholder="Describe the input requirements, desired output, and completion criteria"
                            rows={4}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="custom-timeline">Timeline</Label>
                          <Input
                            id="custom-timeline"
                            value={timeline}
                            onChange={(event) => setTimeline(event.target.value)}
                            placeholder="Example: needed within 7 days"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="custom-reference">Reference link</Label>
                          <Input
                            id="custom-reference"
                            value={referenceLink}
                            onChange={(event) => setReferenceLink(event.target.value)}
                            placeholder="Reference link (optional)"
                          />
                        </div>

                        <Button type="submit" loading={requestLoading} className="w-full">
                          Send quote request
                        </Button>
                      </form>
                    ) : null}
                  </div>
                )}

                {lockedByVip ? (
                  <p className="rounded-[var(--radius-md)] border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
                    VIP-only product. You need to upgrade to VIP to buy it.
                  </p>
                ) : null}

                {requestMessage ? (
                  <p className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {requestMessage}
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Related products</CardTitle>
            <CardDescription>
              Prioritize the same category, then fall back to the same product type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatedProducts.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No related products yet.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
                {relatedProducts.map((item) => (
                  <RelatedProductCard
                    key={item._id}
                    product={item}
                    discountPercent={discountPercent}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
