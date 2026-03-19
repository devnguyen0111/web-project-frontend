"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { listMyOrders } from "@/lib/api/store";
import type { PaginatedResult, StoreOrder, StoreOrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 10;
const smoothEase = [0.22, 1, 0.36, 1] as const;

const ORDER_STATUS_OPTIONS: Array<{ value: StoreOrderStatus | "all"; label: string }> = [
  { value: "all", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "quoted", label: "Quoted" },
  { value: "quote_accepted", label: "Quote accepted" },
  { value: "processing", label: "Processing" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "disputed", label: "Disputed" },
];

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

function getOrderId(order: StoreOrder) {
  return order._id ?? order.id ?? "";
}

export default function MyOrdersPage() {
  const { user, initializing } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StoreOrderStatus | "all">("all");
  const [response, setResponse] = useState<PaginatedResult<StoreOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const orders = useMemo(() => response?.data ?? [], [response]);
  const totalPages = response?.totalPages ?? 1;
  const totalOrders = response?.total ?? 0;

  useEffect(() => {
    if (!user) {
      setResponse(null);
      setLoading(false);
      return;
    }

    let active = true;

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const next = await listMyOrders({
          page,
          limit: PAGE_SIZE,
          status: status === "all" ? undefined : status,
        });

        if (!active) return;
        setResponse(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load your orders");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [page, status, user]);

  useEffect(() => {
    setPage(1);
  }, [status]);

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
          transition={{ duration: 0.32, ease: smoothEase }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
            <Card className="overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
              <CardContent className="grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
                <div className="space-y-4">
                  <Badge className="w-fit bg-white/85 text-slate-800">Orders</Badge>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    Track purchases, quote decisions, and delivery status in one place
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                    Sign in to view order history, follow quote updates, and keep download or
                    cancellation actions separated from the rest of the app.
                  </p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-5">
                  <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">
                      Total orders
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{formatCoins(totalOrders)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/78 p-4 text-sm text-slate-700">
                    Orders stay constrained and readable, while the banner gives the page a
                    stronger editorial frame.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/login" className={cn(buttonVariants({ variant: "default" }))}>
                      Log in
                    </Link>
                    <Link href="/store" className={cn(buttonVariants({ variant: "outline" }))}>
                      Back to store
                    </Link>
                  </div>
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
        initial={{ opacity: 0, y: 14 }}
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
                  <Badge className="bg-cyan-100 text-cyan-700">Orders</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Track your purchases and quote decisions
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-700">
                  Keep everything in one place: order status, custom quotes, downloads, and
                  support follow-up.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Summary</p>
                <p className="mt-2 text-3xl font-semibold">{formatCoins(totalOrders)}</p>
                <p className="mt-1 text-sm text-slate-700">Total orders</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MotionSection>

      <div className="section-shell mt-8 space-y-6">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm shadow-slate-950/5">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>My orders</CardTitle>
                <CardDescription>
                  Filter by status and open details to accept/reject quote or download files.
                </CardDescription>
              </div>
              <Badge variant="accent">{orders.length} loaded</Badge>
            </div>
            <div className="grid gap-3 sm:max-w-xs">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as StoreOrderStatus | "all")}
                aria-label="Filter by order status"
              >
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Card className="border-rose-200 bg-rose-50">
                <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
              </Card>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner label="Loading orders" />
              </div>
            ) : null}

            {!loading && !orders.length ? (
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="p-8 text-center">
                  <p className="text-lg font-semibold text-slate-950">No orders found</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Try another status filter or place a new order from the store.
                  </p>
                  <div className="mt-4">
                    <Link href="/store" className={cn(buttonVariants({ variant: "default" }))}>
                      Browse store
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!loading && orders.length ? (
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderId = getOrderId(order);
                  const statusBadge = getStatusBadge(order.status);
                  const firstItem = order.items?.[0];
                  return (
                    <Card key={orderId} className="border-slate-200 bg-slate-50">
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                            {order.status === "quoted" ? (
                              <Badge variant="accent">Quote pending</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-slate-600">
                            {firstItem?.productSnapshot?.name ?? "Order item"} -{" "}
                            {order.items?.length ?? 0} item(s)
                          </p>
                          <p className="text-sm text-slate-600">
                            Total {formatCoins(order.totalAmount)} coin - Created{" "}
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/orders/${orderId}`}
                            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                          >
                            View details
                          </Link>
                          {firstItem?.productSnapshot?.slug ? (
                            <Link
                              href={`/store/${firstItem.productSnapshot.slug}`}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Product
                            </Link>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <p className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
