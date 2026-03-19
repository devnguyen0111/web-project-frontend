"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { MotionSection } from "@/components/motion";
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
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  cancelOrder,
  createOrder,
  getOrderDownloadLink,
  getProductBySlug,
  listMyOrders,
  listProducts,
} from "@/lib/api/store";
import type {
  OrderDownloadLinkResponse,
  StoreOrder,
  StoreOrderStatus,
  StoreProduct,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;
type DetailSection = "overview" | "included" | "faq" | "reviews" | "policy";

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getProductImage(product?: StoreProduct | null) {
  return product?.images?.[0]?.url ?? product?.previewUrl ?? "";
}

function getProductStatusBadge(status: string) {
  if (status === "active") {
    return { label: "Active", variant: "accent" as const };
  }

  if (status === "pending_review") {
    return { label: "Pending review", variant: "default" as const };
  }

  if (status === "draft") {
    return { label: "Draft", variant: "default" as const };
  }

  return { label: status.replace(/_/g, " "), variant: "destructive" as const };
}

function getOrderStatusBadge(status: StoreOrderStatus) {
  if (status === "completed" || status === "delivered") return { label: status, variant: "accent" as const };
  if (status === "cancelled" || status === "refunded" || status === "disputed") return { label: status, variant: "destructive" as const };
  return { label: status, variant: "default" as const };
}

function resolveDownloadUrl(value: OrderDownloadLinkResponse | string) {
  if (typeof value === "string") return value;
  return value.downloadUrl ?? value.url ?? value.signedUrl ?? "";
}

function canCancelOrder(status: StoreOrderStatus) {
  return ["pending", "paid", "quoted", "processing"].includes(status);
}

function canDownloadOrder(status: StoreOrderStatus) {
  return status === "delivered" || status === "completed";
}

function getMaxQuantity(product?: StoreProduct | null) {
  if (!product || product.type === "custom_order") return 1;
  const stockCap = typeof product.stock === "number" && product.stock > 0 ? product.stock : 20;
  const perUserCap = typeof product.maxPerUser === "number" && product.maxPerUser > 0 ? product.maxPerUser : 20;
  return Math.max(1, Math.min(stockCap, perUserCap));
}

function getDeliveryLabel(product?: StoreProduct | null) {
  if (!product) return "Delivery details unavailable";
  if (product.type === "digital") return "Instant delivery after coin payment";
  if (product.estimatedDays) return `Estimated ${product.estimatedDays.min}-${product.estimatedDays.max} days`;
  return "Quote available after request";
}

function getPolicyItems(product?: StoreProduct | null) {
  if (!product) return [];
  if (product.type === "digital") {
    return [
      "Access is released after wallet payment completes.",
      "Download links live in the order detail page.",
      "Open a ticket if a file needs review or replacement.",
      "Subscriber discounts can apply where configured.",
    ];
  }
  return [
    "Submit a short brief and receive a quote before work begins.",
    "Quote acceptance is required before production starts.",
    "Delivery timing depends on scope, revisions, and available slots.",
    "Use ticket support if the brief needs clarification.",
  ];
}

export default function StoreProductPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buyerNote, setBuyerNote] = useState("");
  const [recentOrders, setRecentOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionOrderId, setActionOrderId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeSection, setActiveSection] = useState<DetailSection>("overview");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");

  const galleryImages = useMemo(() => product?.images ?? [], [product]);
  const heroImage = galleryImages[selectedImageIndex]?.url ?? getProductImage(product);
  const maxQuantity = useMemo(() => getMaxQuantity(product), [product]);
  const isSoldOut = Boolean(product) && product?.type === "digital" && typeof product.stock === "number" && product.stock <= 0;

  const matchingOrders = useMemo(() => {
    if (!product) return [];
    return recentOrders.filter((order) => order.items?.some((item) => item.productId === product._id));
  }, [product, recentOrders]);

  const purchaseQuantity = product?.type === "digital" ? quantity : 1;
  const estimatedTotal = product ? product.price * purchaseQuantity : 0;
  const walletBalance = user?.wallet?.balance;
  const walletShortage = typeof walletBalance === "number" ? Math.max(0, estimatedTotal - walletBalance) : null;
  const hasWalletBalance = typeof walletBalance === "number";
  const hasEnoughBalance = hasWalletBalance && (walletShortage ?? 0) <= 0;
  const walletNeedsTopup = hasWalletBalance && (walletShortage ?? 0) > 0;
  const deliveryLabel = useMemo(() => getDeliveryLabel(product), [product]);
  const policyItems = useMemo(() => getPolicyItems(product), [product]);

  const memberDiscountMessage = useMemo(() => {
    if (!product?.subscriberDiscount || !user?.subscription?.planCode || user.subscription.planCode === "free") return "";
    const discount = user.subscription.planCode === "vip" ? product.subscriberDiscount.vip : product.subscriberDiscount.pro;
    if (!discount) return "";
    return `${user.subscription.planCode.toUpperCase()} members may qualify for -${discount}% pricing on this product.`;
  }, [product, user?.subscription?.planCode]);

  const walletMessage = useMemo(() => {
    if (!user) return "Log in to see your wallet balance and complete coin checkout.";
    if (typeof walletBalance !== "number") return "Wallet balance is temporarily unavailable. Check your wallet before checkout.";
    if (walletShortage && walletShortage > 0) return `You need ${formatCoins(walletShortage)} more coin to cover this order.`;
    return `Wallet balance: ${formatCoins(walletBalance)} coin.`;
  }, [user, walletBalance, walletShortage]);
  const statusBadge = useMemo(() => (product ? getProductStatusBadge(product.status) : null), [product]);
  const keyFactChips = useMemo(() => {
    const chips = [
      product?.type === "digital" ? "Digital product" : "Custom service",
      product?.type === "digital" ? "Instant delivery" : "Quote-first workflow",
      "Wallet payment",
      "Ticket support",
      product?.subscriberDiscount ? "Subscriber discount available" : "Policy-backed support",
    ];
    return chips;
  }, [product?.subscriberDiscount, product?.type]);
  const showRecentOrders = Boolean(user && matchingOrders.length > 0);

  const loadRecentOrders = useCallback(async (currentSlug = slug) => {
    if (!user || !currentSlug) {
      setRecentOrders([]);
      return;
    }

    setOrdersLoading(true);
    setActionError("");
    try {
      const response = await listMyOrders({ page: 1, limit: 8 });
      setRecentOrders(response.data ?? []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load recent orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      setProduct(null);
      setSelectedImageIndex(0);
        setActiveSection("overview");
      try {
        const response = await getProductBySlug(slug);
        if (!active) return;
        setProduct(response);
        setQuantity(1);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => { void loadRecentOrders(); }, [loadRecentOrders]);
  useEffect(() => {
    if (!product) return;
    let active = true;
    setRelatedLoading(true);
    setRelatedError("");

    void (async () => {
      try {
        const response = await listProducts({
          page: 1,
          limit: 6,
          type: product.type,
          categoryId: product.categoryId,
          status: "active",
        });
        if (!active) return;
        setRelatedProducts((response.data ?? []).filter((item) => item._id !== product._id));
      } catch (err) {
        if (!active) return;
        setRelatedError(err instanceof Error ? err.message : "Failed to load related products");
      } finally {
        if (active) setRelatedLoading(false);
      }
    })();

    return () => { active = false; };
  }, [product]);

  useEffect(() => {
    if (!galleryImages.length) {
      setSelectedImageIndex(0);
      return;
    }
    if (selectedImageIndex >= galleryImages.length) {
      setSelectedImageIndex(0);
    }
  }, [galleryImages.length, selectedImageIndex]);

  const refreshOrdersAndProfile = useCallback(async () => {
    await Promise.all([loadRecentOrders(), refreshProfile()]);
  }, [loadRecentOrders, refreshProfile]);

  async function handleBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setSuccessMessage("");
    setActionError("");

    try {
      const order = await createOrder({
        productId: product._id,
        quantity: product.type === "digital" ? quantity : 1,
        buyerNote: buyerNote.trim() || undefined,
      });
      setSuccessMessage(`Order ${order.orderNumber} created successfully with status ${order.status}.`);
      setBuyerNote("");
      await refreshOrdersAndProfile();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(order: StoreOrder) {
    const reason = window.prompt("Optional cancel reason");
    if (reason === null) return;

    setActionOrderId(order._id);
    setActionError("");
    setActionMessage("");
    try {
      const updated = await cancelOrder(order._id, reason.trim() || undefined);
      setActionMessage(`Order ${updated.orderNumber} cancelled.`);
      await refreshOrdersAndProfile();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to cancel order");
    } finally {
      setActionOrderId("");
    }
  }

  async function handleDownload(order: StoreOrder) {
    setActionOrderId(order._id);
    setActionError("");
    setActionMessage("");
    try {
      const response = await getOrderDownloadLink(order._id);
      const url = resolveDownloadUrl(response);
      if (!url) throw new Error("Download link is not available");
      window.open(url, "_blank", "noopener,noreferrer");
      setActionMessage(`Download opened for ${order.orderNumber}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open download");
    } finally {
      setActionOrderId("");
    }
  }

  function renderCheckoutPanel(className?: string) {
    if (!product) return null;

    return (
      <Card id="purchase-panel" className={cn("border-slate-200 bg-white/95 shadow-xl shadow-sky-100/50 backdrop-blur", className)}>
        <CardHeader className="space-y-4 pb-3">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sky-100 text-sky-700">{product.type === "digital" ? "Digital" : "Custom order"}</Badge>
              <Badge className="bg-amber-100 text-amber-700">{product.type === "digital" ? "Instant delivery" : "Quote flow"}</Badge>
              {statusBadge ? <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge> : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl leading-tight text-slate-950">{product.name}</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                {product.shortDescription ?? product.description ?? "Product-ready checkout with wallet and ticket support."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <p className="rounded-full bg-slate-100 px-3 py-1">Rating <span className="font-semibold text-slate-900">{formatCoins(product.rating)}</span></p>
              <p className="rounded-full bg-slate-100 px-3 py-1">{formatCoins(product.salesCount)} sold</p>
              <p className="rounded-full bg-slate-100 px-3 py-1">{formatCoins(product.reviewsCount)} reviews</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 via-sky-50 to-cyan-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Price</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <p className="text-3xl font-semibold text-slate-950">{formatCoins(product.price)} coin</p>
              {product.originalPrice && product.originalPrice > product.price ? (
                <p className="pb-1 text-sm text-slate-600 line-through">{formatCoins(product.originalPrice)} coin</p>
              ) : null}
            </div>
            {memberDiscountMessage ? <p className="mt-2 text-sm font-medium text-cyan-700">{memberDiscountMessage}</p> : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Wallet balance</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{walletMessage}</p>
              {user ? (
                <Badge className="mt-2" variant={hasEnoughBalance ? "accent" : walletNeedsTopup ? "destructive" : "default"}>
                  {hasEnoughBalance ? "Ready to checkout" : walletNeedsTopup ? "Top up needed" : "Temporarily unavailable"}
                </Badge>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Delivery</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{deliveryLabel}</p>
              <p className="mt-1 text-xs text-slate-600">
                {product.type === "digital" ? "Files unlock immediately after payment." : "Request is reviewed before production starts."}
              </p>
            </div>
          </div>

          {user ? (
            <form className="space-y-4" onSubmit={handleBuy}>
              {product.type === "digital" ? (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const nextValue = Number(event.target.value);
                      if (!Number.isFinite(nextValue)) {
                        setQuantity(1);
                        return;
                      }
                      setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(nextValue))));
                    }}
                    disabled={isSoldOut}
                  />
                  {isSoldOut ? (
                    <p className="text-xs text-rose-600">This product is currently sold out.</p>
                  ) : (
                    <p className="text-xs text-slate-600">Maximum quantity: {maxQuantity}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="buyer-note">Request summary</Label>
                  <Input
                    id="buyer-note"
                    value={buyerNote}
                    onChange={(event) => setBuyerNote(event.target.value)}
                    placeholder="Short brief for quote review"
                  />
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Estimated total</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{formatCoins(estimatedTotal)} coin</p>
              </div>

              {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
              {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="submit" className="w-full" disabled={submitting || Boolean(isSoldOut) || walletNeedsTopup}>
                  {submitting ? "Processing..." : product.type === "digital" ? "Buy with coin" : "Send request"}
                </Button>
                <Link href="/wallet" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Open wallet</Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/tickets/new" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Support ticket</Link>
                {walletNeedsTopup ? (
                  <Link href="/wallet/deposit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                    Top up {formatCoins(walletShortage ?? 0)} coin
                  </Link>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-600">Log in to continue with wallet checkout and see your available balance.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/login" className={cn(buttonVariants({ variant: "default" }), "w-full")}>Log in</Link>
                <Link href="/wallet" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Open wallet</Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-20">
      {loading ? (
        <div className="section-shell mt-8 flex justify-center py-10">
          <Spinner label="Loading product" />
        </div>
      ) : null}

      {error ? (
        <MotionSection
          className="section-shell mt-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: smoothEase }}
        >
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        </MotionSection>
      ) : null}

      {product ? (
        <>
          <MotionSection
            className="relative isolate overflow-hidden bg-gradient-to-b from-amber-50 via-sky-50 to-white pt-6 pb-10 lg:pt-8 lg:pb-14"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: smoothEase }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="absolute right-0 top-2 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl" />
            </div>

            <div className="section-shell relative">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
                <Link href="/store" className="hover:text-slate-800">Store</Link>
                <span>/</span>
                <span>{product.type === "custom_order" ? "Custom order" : "Digital product"}</span>
                <span>/</span>
                <span className="truncate text-slate-900">{product.name}</span>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] lg:items-start lg:gap-8">
                <div className="space-y-6">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-lg shadow-sky-100/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl text-slate-950">Gallery / Preview</CardTitle>
                      <CardDescription className="text-slate-700">Large preview, thumbnails, and trust badges before checkout.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        {heroImage ? (
                          <Image
                            src={heroImage}
                            alt={product.images?.[selectedImageIndex]?.alt ?? product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 58vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-700">
                            <p className="text-[11px] uppercase tracking-[0.22em]">Preview unavailable</p>
                          </div>
                        )}

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <Badge className="bg-white text-slate-800 shadow">{product.type === "digital" ? "Digital" : "Custom order"}</Badge>
                          <Badge className="bg-white text-slate-800 shadow">{product.type === "digital" ? "Instant delivery" : "Quote flow"}</Badge>
                          {statusBadge ? <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge> : null}
                        </div>
                      </div>

                      {galleryImages.length > 1 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {galleryImages.slice(0, 4).map((image, index) => (
                            <button
                              key={`${image.url}-${index}`}
                              type="button"
                              onClick={() => setSelectedImageIndex(index)}
                              className={cn(
                                "relative aspect-[4/3] overflow-hidden rounded-xl border transition",
                                selectedImageIndex === index ? "border-cyan-500 ring-2 ring-cyan-200" : "border-slate-200 hover:border-cyan-300",
                              )}
                            >
                              <Image
                                src={image.url}
                                alt={image.alt ?? `${product.name} preview ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="180px"
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-3">
                          {["Digital files included", "Instant access", "Support included"].map((item) => (
                            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                              {item}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {keyFactChips.slice(0, 5).map((chip) => (
                          <Badge key={chip} variant="default" className="bg-slate-100 text-slate-700">{chip}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {renderCheckoutPanel("lg:hidden")}

                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-950">Key benefits / includes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {["Instant delivery", "Wallet payment", "Ticket support", "Subscriber discount", "What's included"].map((chip) => (
                          <Badge key={chip} className="bg-amber-100 text-amber-700">{chip}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card id="store-main-content" className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-2xl text-slate-950">Product content</CardTitle>
                          <CardDescription className="text-slate-700">Description, included files, FAQ, reviews, and policy in one flow.</CardDescription>
                        </div>
                        <Badge variant="accent">{product.type === "digital" ? "Digital flow" : "Custom order flow"}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "overview" as const, label: "Overview" },
                          { key: "included" as const, label: "What you get" },
                          { key: "faq" as const, label: "FAQ" },
                          { key: "reviews" as const, label: "Reviews" },
                          { key: "policy" as const, label: "Policy" },
                        ].map((section) => {
                          const active = activeSection === section.key;
                          return (
                            <Button
                              key={section.key}
                              type="button"
                              variant={active ? "secondary" : "outline"}
                              size="sm"
                              className={cn(active ? "bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}
                              onClick={() => setActiveSection(section.key)}
                            >
                              {section.label}
                            </Button>
                          );
                        })}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {activeSection === "overview" ? (
                        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                          <div className="space-y-4">
                            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                              {product.description ?? product.shortDescription ?? "No description provided."}
                            </p>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                              <p className="font-semibold text-slate-900">Who should buy this</p>
                              <p className="mt-2">
                                {product.type === "digital"
                                  ? "Buyers who want instant access to ready-to-use files with wallet payment and ticket support."
                                  : "Buyers who need scoped custom work, with brief-first intake and quote approval."}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-semibold text-slate-900">Use cases</p>
                              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                <div className="rounded-xl border border-slate-200 bg-white p-3">Launch quickly with ready checkout and trust-first store flow.</div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3">Use wallet coin payments to reduce checkout friction.</div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3">Handle post-purchase issues via support ticket flow.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {activeSection === "included" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-950">{product.type === "digital" ? "Files included" : "Included service scope"}</p>
                            <div className="mt-3 grid gap-2">
                              {product.type === "digital" ? (
                                product.files?.length ? (
                                  product.files.map((file) => (
                                    <div key={`${file.storagePath}-${file.version ?? 0}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-slate-950">{file.filename}</p>
                                          <p className="text-xs text-slate-600">{file.storagePath}</p>
                                        </div>
                                        <div className="text-right text-xs text-slate-600">
                                          <p>{Math.max(file.size || 0, 0)} bytes</p>
                                          <p>{formatDateTime(file.uploadedAt)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-slate-600">No downloadable files listed yet.</p>
                                )
                              ) : (
                                <>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Brief intake before quote confirmation.</div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Estimated delivery: {deliveryLabel}</div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Ticket support available for revisions and clarifications.</div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-950">Access and compatibility</p>
                            <div className="mt-3 grid gap-2 text-sm text-slate-600">
                              <div className="rounded-xl border border-slate-200 bg-white p-3">Access type: {product.type === "digital" ? "Instant digital unlock" : "Quote-based service access"}</div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3">Support: Ticket support before and after purchase.</div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3">Updates: Managed by seller policy and delivery notes.</div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {activeSection === "faq" ? (
                        <div className="grid gap-3">
                          {[
                            {
                              q: "How do I receive the product?",
                              a: product.type === "digital"
                                ? "Delivery is instant after wallet payment. Download links appear in your order detail."
                                : "For custom orders, submit a brief and wait for quote acceptance before production.",
                            },
                            { q: "Can I get support via ticket?", a: "Yes. Open a support ticket anytime for pre-purchase and post-purchase help." },
                            { q: "Is refund available?", a: "Refund and cancellation terms follow the policy tab and seller support scope." },
                          ].map((item) => (
                            <div key={item.q} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="font-semibold text-slate-950">{item.q}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {activeSection === "reviews" ? (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Reviews summary</p>
                            <p className="mt-2 text-4xl font-semibold text-slate-950">{formatCoins(product.rating)}</p>
                            <p className="mt-1 text-sm text-slate-600">{formatCoins(product.reviewsCount)} reviews</p>
                          </div>
                          {!product.reviewsCount ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                              <p>Chua co review nao.</p>
                              <p className="mt-1">Hay la nguoi dau tien danh gia.</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {activeSection === "policy" ? (
                        <div className="grid gap-3">
                          {policyItems.map((item) => (
                            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card id="store-support" className="overflow-hidden border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-amber-50 shadow-sm">
                    <CardContent className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-3 rounded-2xl border border-white/80 bg-white/75 p-4">
                        <Badge className="bg-cyan-100 text-cyan-700">Support / Trust</Badge>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Need help before checkout?</h2>
                        <p className="text-sm leading-6 text-slate-700">
                          Average response within 6 hours. Digital issues and policy questions are handled via ticket.
                        </p>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-white/80 bg-white/90 p-4">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Link href="/tickets/new" className={cn(buttonVariants({ variant: "default" }), "w-full")}>Open ticket</Link>
                          <Button variant="outline" className="w-full" onClick={() => setActiveSection("faq")}>View FAQ</Button>
                          <Button variant="outline" className="w-full" onClick={() => setActiveSection("policy")}>View policy</Button>
                        </div>
                        <p className="text-xs text-slate-700">Digital delivery and support are tracked in order and ticket history.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
                  {renderCheckoutPanel()}

                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-950">Trust details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-600">
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Delivery: {deliveryLabel}</p>
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Support: Ticket-first response channel</p>
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Policy: Digital access and refund terms available</p>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </div>
          </MotionSection>

          <MotionSection
            className="section-shell mt-8"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">Related products</CardTitle>
                <CardDescription className="text-slate-700">Discover similar products without interrupting your current checkout flow.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {relatedError ? <p className="text-sm text-rose-600">{relatedError}</p> : null}
                {relatedLoading ? (
                  <div className="flex justify-center py-6">
                    <Spinner label="Loading related" />
                  </div>
                ) : null}
                {!relatedLoading && !relatedProducts.length ? <p className="text-sm text-slate-600">No related products yet.</p> : null}
                {!relatedLoading && relatedProducts.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {relatedProducts.slice(0, 4).map((item) => {
                      const relatedImage = getProductImage(item);
                      return (
                        <Link
                          key={item._id}
                          href={`/store/${item.slug}`}
                          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-cyan-300 hover:shadow-md"
                        >
                          <div className="relative aspect-[4/3] bg-slate-100">
                            {relatedImage ? (
                              <Image
                                src={relatedImage}
                                alt={item.name}
                                fill
                                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                                sizes="(max-width: 1280px) 50vw, 20vw"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-slate-400">No preview</div>
                            )}
                          </div>
                          <div className="space-y-2 p-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge className="bg-slate-100 text-slate-700">{item.type === "digital" ? "Digital" : "Custom"}</Badge>
                              {item.subscriberDiscount ? <Badge className="bg-amber-100 text-amber-700">Discount</Badge> : null}
                            </div>
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-cyan-700">{formatCoins(item.price)} coin</p>
                              <span className="text-xs text-slate-600">View details</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </MotionSection>

          {showRecentOrders ? (
            <MotionSection
              id="recent-orders"
              className="section-shell mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: smoothEase }}
            >
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-slate-950">My recent orders</CardTitle>
                      <CardDescription>Only showing orders linked to this product.</CardDescription>
                    </div>
                    {ordersLoading ? <Badge>Loading</Badge> : null}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {matchingOrders.map((order) => {
                    const orderStatus = getOrderStatusBadge(order.status);
                    const cancellable = canCancelOrder(order.status);
                    const downloadable = canDownloadOrder(order.status);
                    return (
                      <div key={order._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                              <Badge variant={orderStatus.variant}>{orderStatus.label}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{order.items?.length ?? 0} item(s) - Total {formatCoins(order.totalAmount)} coin</p>
                            <p className="text-xs text-slate-600">Created {formatDateTime(order.createdAt)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {downloadable ? <Button variant="outline" onClick={() => handleDownload(order)} disabled={actionOrderId === order._id}>Download</Button> : null}
                            {cancellable ? <Button variant="destructive" onClick={() => handleCancel(order)} disabled={actionOrderId === order._id}>Cancel</Button> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {actionMessage ? <p className="text-sm text-emerald-700">{actionMessage}</p> : null}
                  {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
                </CardContent>
              </Card>
            </MotionSection>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
            <div className="section-shell flex items-center gap-3 px-0">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Buy now</p>
                <p className="truncate text-sm font-semibold text-slate-900">{formatCoins(estimatedTotal)} coin</p>
              </div>
              <Button
                type="button"
                className="shrink-0"
                onClick={() => document.getElementById("purchase-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Checkout
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {!product && !loading ? (
        <MotionSection
          className="section-shell mt-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: smoothEase }}
        >
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-950">Product not found</p>
              <p className="mt-2 text-sm text-slate-600">This product may have been archived or the slug is invalid.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link href="/store" className={cn(buttonVariants({ variant: "default" }))}>Return to store</Link>
                <Link href="/tickets/new" className={cn(buttonVariants({ variant: "outline" }))}>Open a ticket</Link>
              </div>
            </CardContent>
          </Card>
        </MotionSection>
      ) : null}
    </main>
  );
}

