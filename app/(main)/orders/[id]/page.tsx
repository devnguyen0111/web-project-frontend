"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  Textarea,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  acceptOrderQuote,
  cancelOrder,
  getOrderById,
  getOrderDownloadLink,
  rejectOrderQuote,
} from "@/lib/api/store";
import type { OrderDownloadLinkResponse, StoreOrder, StoreOrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getOrderId(order?: StoreOrder | null) {
  if (!order) return "";
  return order._id ?? order.id ?? "";
}

function getStatusBadge(status: StoreOrderStatus) {
  if (status === "delivered" || status === "completed" || status === "processing") {
    return { label: status.replace(/_/g, " "), variant: "accent" as const };
  }

  if (status === "cancelled" || status === "refunded" || status === "disputed") {
    return { label: status.replace(/_/g, " "), variant: "destructive" as const };
  }

  return { label: status.replace(/_/g, " "), variant: "default" as const };
}

function canCancelOrder(status: StoreOrderStatus) {
  return ["pending", "paid", "quoted", "processing"].includes(status);
}

function canDownloadOrder(status: StoreOrderStatus) {
  return status === "delivered" || status === "completed";
}

function resolveDownloadUrl(value: OrderDownloadLinkResponse | string) {
  if (typeof value === "string") return value;
  return value.downloadUrl ?? value.url ?? value.signedUrl ?? "";
}

function isQuotedCustomOrder(order?: StoreOrder | null) {
  if (!order || order.status !== "quoted" || !order.quote) return false;
  const firstItem = order.items?.[0];
  return firstItem?.productSnapshot?.type === "custom_order";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, initializing, refreshProfile } = useAuth();
  const orderId = params?.id ?? "";

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const statusBadge = useMemo(
    () => (order ? getStatusBadge(order.status) : null),
    [order],
  );
  const quotePending = useMemo(() => isQuotedCustomOrder(order), [order]);
  const currentOrderId = useMemo(() => getOrderId(order), [order]);

  const loadOrder = useCallback(async () => {
    if (!orderId || !user) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextOrder = await getOrderById(orderId);
      setOrder(nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function runOrderAction(task: () => Promise<StoreOrder>, successText: string) {
    setActionLoading(true);
    setError("");
    setActionMessage("");
    try {
      const updated = await task();
      setOrder(updated);
      setActionMessage(successText);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    const reason = window.prompt("Optional cancel reason");
    if (reason === null) return;
    await runOrderAction(
      () => cancelOrder(currentOrderId, reason.trim() || undefined),
      `Order ${order.orderNumber} cancelled.`,
    );
  }

  async function handleDownload() {
    if (!order) return;
    setActionLoading(true);
    setError("");
    setActionMessage("");
    try {
      const response = await getOrderDownloadLink(currentOrderId);
      const url = resolveDownloadUrl(response);
      if (!url) throw new Error("Download link is not available");
      window.open(url, "_blank", "noopener,noreferrer");
      setActionMessage("Download opened in a new tab.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open download link");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptQuote() {
    if (!order) return;
    await runOrderAction(
      () => acceptOrderQuote(currentOrderId),
      `Quote accepted for ${order.orderNumber}. The order moved to processing.`,
    );
  }

  async function handleRejectQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    await runOrderAction(
      () => rejectOrderQuote(currentOrderId, { reason: rejectReason.trim() || undefined }),
      `Quote rejected for ${order.orderNumber}.`,
    );
    setRejectReason("");
  }

  if (initializing) {
    return (
      <main className="section-shell flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading account" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="pb-16 pt-0">
        <MotionSection
          className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
            <Card className="overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
              <CardContent className="space-y-4 p-8 text-center md:p-10">
                <h1 className="text-2xl font-semibold md:text-4xl">Order detail</h1>
                <p className="text-sm text-slate-700">
                  Log in to view this order and manage quote actions.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/login" className={cn(buttonVariants({ variant: "default" }))}>
                    Log in
                  </Link>
                  <Link href="/orders/me" className={cn(buttonVariants({ variant: "outline" }))}>
                    Back to orders
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </MotionSection>
      </main>
    );
  }

  return (
    <main className="pb-16 pt-0">
      <MotionSection
        className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: smoothEase }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
          <Card className="overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="grid gap-5 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
              <div className="space-y-3">
                <Badge className="bg-cyan-400/20 text-cyan-100">Order detail</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {order?.orderNumber ?? "Order detail"}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-700">
                  Manage quote decisions, delivery, and support from a single, structured
                  screen while the detailed workflow stays constrained below.
                </p>
              </div>
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 sm:grid-cols-3 md:grid-cols-1">
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">Total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatCoins(order?.totalAmount)} coin
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">Items</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {order?.items?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">
                    Seller receives
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatCoins(order?.sellerReceives)} coin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MotionSection>

      <MotionSection
        className="section-shell mt-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: smoothEase }}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/orders/me" className="hover:text-slate-900">
            Orders
          </Link>
          <span>/</span>
          <span className="text-slate-900">{order?.orderNumber ?? "Order detail"}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner label="Loading order detail" />
          </div>
        ) : null}

        {!loading && !order ? (
          <Card>
            <CardContent className="space-y-3 p-8 text-center">
              <p className="text-xl font-semibold text-slate-950">Order not found</p>
              <p className="text-sm text-slate-600">
                The order may be unavailable or you do not have permission to access it.
              </p>
              <div>
                <Button onClick={() => router.push("/orders/me")}>Back to orders</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!loading && order ? (
          <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
            <Card className="border-slate-200/90 bg-white/95">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl">{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Created {formatDateTime(order.createdAt)} • Updated {formatDateTime(order.updatedAt)}
                    </CardDescription>
                  </div>
                  {statusBadge ? <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge> : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatCoins(order.totalAmount)} coin</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Items</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{order.items?.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Seller receives</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatCoins(order.sellerReceives)} coin</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {(order.items ?? []).map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{item.productSnapshot?.name ?? item.productId}</p>
                          <p className="text-sm text-slate-600">
                            {item.productSnapshot?.type === "custom_order" ? "Custom order" : "Digital"} • Qty {item.quantity}
                          </p>
                          {item.productSnapshot?.slug ? (
                            <Link
                              href={`/store/${item.productSnapshot.slug}`}
                              className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
                            >
                              View product
                            </Link>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCoins(item.subtotal)} coin</p>
                      </div>
                    </div>
                  ))}
                </div>

                {order.buyerNote ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">Buyer note</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{order.buyerNote}</p>
                  </div>
                ) : null}

                {order.cancelReason ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-900">Cancel reason</p>
                    <p className="mt-2 text-sm leading-6 text-rose-700">{order.cancelReason}</p>
                  </div>
                ) : null}

                {error ? (
                  <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="p-3 text-sm text-rose-700">{error}</CardContent>
                  </Card>
                ) : null}

                {actionMessage ? (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-3 text-sm text-emerald-700">{actionMessage}</CardContent>
                  </Card>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200/90 bg-white/95 lg:sticky lg:top-24">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Manage quote decisions, cancellation, and digital delivery from one panel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quotePending ? (
                    <Card className="border-cyan-200 bg-cyan-50">
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <p className="font-semibold text-cyan-900">Quote available</p>
                          <p className="mt-1 text-sm text-cyan-800">
                            Price {formatCoins(order.quote?.price)} coin
                            {order.quote?.estimatedDays ? ` • ${order.quote.estimatedDays} day(s)` : ""}
                          </p>
                          {order.quote?.note ? (
                            <p className="mt-2 text-sm leading-6 text-cyan-900">{order.quote.note}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={handleAcceptQuote} disabled={actionLoading}>
                            {actionLoading ? "Processing..." : "Accept quote"}
                          </Button>
                        </div>
                        <form className="space-y-2" onSubmit={handleRejectQuote}>
                          <Textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            placeholder="Optional reason when rejecting quote"
                          />
                          <Button type="submit" variant="destructive" disabled={actionLoading}>
                            {actionLoading ? "Processing..." : "Reject quote"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {canCancelOrder(order.status) ? (
                      <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                        {actionLoading ? "Processing..." : "Cancel order"}
                      </Button>
                    ) : null}

                    {canDownloadOrder(order.status) ? (
                      <Button variant="outline" onClick={handleDownload} disabled={actionLoading}>
                        {actionLoading ? "Opening..." : "Download"}
                      </Button>
                    ) : null}

                    <Link
                      href="/orders/me"
                      className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                    >
                      Back to orders
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status timeline</CardTitle>
                  <CardDescription>Latest workflow transitions for this order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(order.statusHistory ?? []).length ? (
                    [...(order.statusHistory ?? [])]
                      .sort((a, b) => {
                        const first = new Date(a.changedAt).getTime();
                        const second = new Date(b.changedAt).getTime();
                        return first - second;
                      })
                      .map((entry, index) => (
                        <div key={`${entry.to}-${entry.changedAt}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-950">
                            {(entry.from ?? "start").replace(/_/g, " ")} → {entry.to.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.changedAt)}</p>
                          {entry.note ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">{entry.note}</p>
                          ) : null}
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-slate-600">No timeline entries.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </MotionSection>
    </main>
  );
}
