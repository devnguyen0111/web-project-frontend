"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/common/pagination-controls";
import { StaffStoreNav } from "@/components/common/staff-store-nav";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
} from "@/components/ui";
import { apiRequest } from "@/lib/api/http";
import type { PaginatedResult } from "@/lib/types";

type OrderStatus =
  | "pending"
  | "paid"
  | "quoted"
  | "quote_accepted"
  | "processing"
  | "delivered"
  | "completed"
  | "cancelled";

type OrderItem = {
  productId: string;
  productName: string;
  productSlug: string;
  productType: "digital" | "custom_order";
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: string;
  customData?: Record<string, unknown>;
};

type OrderQuote = {
  priceAmount: number;
  estimatedDays?: number;
  note?: string;
  quotedAt?: string;
  quotedBy?: string;
  acceptedAt?: string;
};

type OrderStatusHistoryEntry = {
  from?: OrderStatus;
  to: OrderStatus;
  note?: string;
  changedBy?: string;
  changedAt: string;
};

type Order = {
  id?: string;
  _id: string;
  orderNumber: string;
  buyerId: string;
  sellerId?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  platformFee?: number;
  sellerReceives?: number;
  currency: string;
  status: OrderStatus;
  source?: "buy_now" | "cart";
  quote?: OrderQuote;
  statusHistory?: OrderStatusHistoryEntry[];
  deliveredAt?: string;
  completedAt?: string;
  paidAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};

type OrdersQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

const PAGE_SIZE = 10;
const ORDER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "quoted", label: "Quoted" },
  { value: "quote_accepted", label: "Quote accepted" },
  { value: "processing", label: "Processing" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

function buildQuery(params: OrdersQuery) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatCurrency(value: number, currency = "VND") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOrderStatus(status: OrderStatus) {
  return status.replace(/_/g, " ");
}

function getStatusTone(status: OrderStatus) {
  switch (status) {
    case "completed":
    case "delivered":
      return "bg-emerald-100 text-emerald-700";
    case "quoted":
    case "quote_accepted":
      return "bg-cyan-100 text-cyan-700";
    case "processing":
    case "paid":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function getOrderKind(order: Order) {
  const customCount = order.items.filter(
    (item) => item.productType === "custom_order",
  ).length;
  if (customCount > 0) {
    return "Custom order";
  }

  return order.source === "cart" ? "Cart checkout" : "Digital product";
}

async function listStoreOrders(query: OrdersQuery = {}) {
  return apiRequest<PaginatedResult<Order>>(
    `/store/orders${buildQuery({
      page: query.page ?? 1,
      limit: query.limit ?? PAGE_SIZE,
      status: query.status,
    })}`,
    { method: "GET" },
  );
}

export default function StaffStoreOrdersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedStatus = useMemo(
    () => (searchParams.get("status") ?? "") as OrderStatus | "",
    [searchParams],
  );

  const selectedPage = useMemo(() => {
    const rawPage = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");

      try {
        const result = await listStoreOrders({
          page: selectedPage,
          limit: PAGE_SIZE,
          status: selectedStatus || undefined,
        });

        if (!active) {
          return;
        }

        const payload = result.data;
        setOrders(payload.data);
        setPage(payload.page);
        setTotalItems(payload.total);
        setTotalPages(Math.max(1, payload.totalPages));
      } catch (err) {
        if (!active) {
          return;
        }

        setOrders([]);
        setTotalItems(0);
        setTotalPages(1);
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedPage, selectedStatus]);

  function updateQuery(next: { page?: number; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextPage = Math.max(1, next.page ?? selectedPage);
    const nextStatus = next.status ?? selectedStatus;

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Staff store</Badge>
              <CardTitle>Store orders</CardTitle>
              <CardDescription>
                Review store orders, filter by status, and open detail to quote
                or deliver custom work.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="md:col-span-2">
                <StaffStoreNav />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="status">
                  Status filter
                </label>
                <Select
                  id="status"
                  value={selectedStatus}
                  onChange={(event) => updateQuery({ page: 1, status: event.target.value })}
                >
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemLabel="orders"
                onPageChange={(nextPage) => updateQuery({ page: nextPage })}
                disabled={loading}
                className="md:min-w-[320px]"
              />
            </CardContent>
          </Card>
        </MotionDiv>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading orders" />
          </div>
        ) : null}

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

        {!loading && orders.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-500">
              No orders matched the selected filter.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {orders.map((order, index) => (
            <MotionDiv
              key={order._id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: smoothEase }}
            >
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                      <CardDescription>{getOrderKind(order)}</CardDescription>
                    </div>
                    <Badge className={`rounded-full px-3 py-1 ${getStatusTone(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 text-sm text-slate-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Total
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Items
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {order.items.length} item(s)
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Created
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Quote
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {order.quote?.priceAmount
                          ? formatCurrency(order.quote.priceAmount, order.currency)
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                    <p className="uppercase tracking-[0.12em] text-slate-400">Latest note</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                      {order.cancelReason || order.quote?.note || "No extra notes"}
                    </p>
                  </div>

                  <div className="mt-auto pt-1">
                    <Link
                      href={`/staff/store/orders/${order._id}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open detail
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </MotionSection>
    </main>
  );
}
