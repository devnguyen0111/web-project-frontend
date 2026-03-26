"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { MotionDiv, MotionSection } from "@/components/motion";
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
import { getOrderDownloadLink, listMyOrders } from "@/lib/api/orders";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE_SIZE = 8;
const smoothEase = [0.22, 1, 0.36, 1] as const;

const ORDER_STATUSES: Array<"all" | OrderStatus> = [
  "all",
  "pending",
  "paid",
  "quoted",
  "quote_accepted",
  "processing",
  "delivered",
  "completed",
  "cancelled",
];

function formatMoney(value?: number, currency = "VND") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function getOrderId(order: Order) {
  return order.id ?? order._id;
}

function getStatusTone(status: OrderStatus) {
  if (status === "completed") {
    return "success";
  }
  if (status === "delivered" || status === "processing" || status === "quoted") {
    return "accent";
  }
  if (status === "cancelled") {
    return "danger";
  }
  return "neutral";
}

function getStatusLabel(status: OrderStatus) {
  return status.replace(/_/g, " ");
}

function getSourceLabel(source: Order["source"]) {
  return source === "cart" ? "Cart checkout" : "Buy now";
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  const appliedStatus = useMemo(
    () => (statusFilter === "all" ? undefined : statusFilter),
    [statusFilter],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listMyOrders({
      page,
      limit: PAGE_SIZE,
      status: appliedStatus,
    })
      .then((result) => {
        if (!active) {
          return;
        }

        setOrders(result.data);
        setPage(result.page);
        setPageInfo({
          total: result.total,
          totalPages: Math.max(1, result.totalPages),
        });
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load orders");
          setOrders([]);
          setPageInfo({ total: 0, totalPages: 1 });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedStatus, page]);

  async function handleDownload(order: Order) {
    const deliveryFiles = order.deliveryFiles ?? [];
    const downloadTarget = deliveryFiles[deliveryFiles.length - 1];
    if (!downloadTarget) {
      return;
    }

    setDownloadingOrderId(getOrderId(order));
    setError("");

    try {
      const response = await getOrderDownloadLink(getOrderId(order), downloadTarget._id);
      window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingOrderId(null);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(12,74,110,0.94),rgba(8,145,178,0.86),rgba(251,191,36,0.9))] p-8 text-white md:grid-cols-[1.4fr_0.8fr] md:p-10">
                <div className="space-y-4">
                  <Badge className="bg-white/20 text-white">Orders</Badge>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    Track every buyer order in one place.
                  </h1>
                  <p className="max-w-2xl text-sm text-white/90 md:text-base">
                    Review status, open order detail, accept custom quotes, and download
                    delivery files when the order is ready.
                  </p>
                </div>
                <div className="glass-panel space-y-3 p-5 text-slate-900">
                  <Link
                    href="/store"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                  >
                    Browse store
                  </Link>
                  <Link
                    href="/cart"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                  >
                    Open cart
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter my orders by lifecycle status.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as "all" | OrderStatus);
                  setPage(1);
                }}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : getStatusLabel(status)}
                  </option>
                ))}
              </Select>
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
            <Spinner label="Loading orders" />
          </div>
        ) : null}

        {!loading && !error ? (
          <PaginationControls
            page={page}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.total}
            itemLabel="orders"
            onPageChange={setPage}
          />
        ) : null}

        {!loading && orders.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-[var(--text-secondary)]">
              No orders found for the selected filter.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {orders.map((order, index) => {
            const deliveryFiles = order.deliveryFiles ?? [];
            const latestFile = deliveryFiles[deliveryFiles.length - 1];
            const canDownload =
              latestFile &&
              (order.status === "delivered" || order.status === "completed");

            return (
              <MotionDiv
                key={order._id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.28, delay: index * 0.04, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <CardDescription>
                          {getSourceLabel(order.source)} | {order.items.length} item
                          {order.items.length > 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusTone(order.status)}>{getStatusLabel(order.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Total
                        </p>
                        <p className="mt-1 font-semibold text-[var(--text-primary)]">
                          {formatMoney(order.total, order.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Created
                        </p>
                        <p className="mt-1 font-semibold text-[var(--text-primary)]">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Quote
                        </p>
                        <p className="mt-1 font-semibold text-[var(--text-primary)]">
                          {order.quote ? formatMoney(order.quote.priceAmount, order.currency) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Delivery
                        </p>
                        <p className="mt-1 font-semibold text-[var(--text-primary)]">
                          {latestFile ? latestFile.fileName : "No file yet"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/orders/${getOrderId(order)}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                      >
                        View detail
                      </Link>
                      {canDownload ? (
                        <Button
                          variant="secondary"
                          onClick={() => void handleDownload(order)}
                          loading={downloadingOrderId === getOrderId(order)}
                        >
                          Download
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            );
          })}
        </div>
      </MotionSection>
    </main>
  );
}
