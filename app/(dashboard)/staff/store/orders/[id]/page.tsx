"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { StaffStoreNav } from "@/components/common/staff-store-nav";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  createStoreOrderQuote,
  deliverStoreOrder,
  getStoreOrderDetail,
  updateStoreOrderStatus,
} from "@/lib/api/store-management";

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

type OrderDeliveryFile = {
  _id?: string;
  bucketName: string;
  objectName: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  uploadedAt: string;
  uploadedBy?: string;
  fromProductAsset?: boolean;
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
  deliveryFiles?: OrderDeliveryFile[];
  statusHistory?: OrderStatusHistoryEntry[];
  deliveredAt?: string;
  completedAt?: string;
  paidAt?: string;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

const STAFF_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["processing"],
  quoted: ["cancelled"],
  quote_accepted: ["processing"],
  processing: [],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

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
  const hasCustom = order.items.some((item) => item.productType === "custom_order");
  if (hasCustom) {
    return "Custom order";
  }

  return order.source === "cart" ? "Cart checkout" : "Digital product";
}

function getSafeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function StaffStoreOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = useMemo(() => params?.id ?? "", [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [note, setNote] = useState("");
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");

  const isCustomOrder = useMemo(
    () => order?.items.some((item) => item.productType === "custom_order") ?? false,
    [order],
  );
  const canEditQuote =
    Boolean(order) && isCustomOrder && (order?.status === "pending" || order?.status === "quoted");
  const canUploadDelivery =
    Boolean(order) && ["paid", "processing", "delivered"].includes(order?.status ?? "");

  async function refreshOrder(nextOrderId = orderId) {
    if (!nextOrderId) {
      return;
    }

      setLoading(true);
      setError("");

    try {
      const data = await getStoreOrderDetail(nextOrderId);
      setOrder(data);
      setPriceAmount(
        data.quote?.priceAmount !== undefined
          ? String(data.quote.priceAmount)
          : "",
      );
      setEstimatedDays(
        data.quote?.estimatedDays !== undefined
          ? String(data.quote.estimatedDays)
          : "",
      );
      setNote(data.quote?.note ?? "");
      const nextOptions = STAFF_STATUS_TRANSITIONS[data.status] ?? [];
      setNextStatus(nextOptions[0] ?? "");
      setStatusNote("");
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Failed to load order detail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !canEditQuote) {
      return;
    }

    const normalizedPrice = Number(priceAmount);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setError("Quote priceAmount must be a positive number");
      return;
    }

    const normalizedDays = estimatedDays.trim() ? Number(estimatedDays) : undefined;
    if (
      normalizedDays !== undefined &&
      (!Number.isFinite(normalizedDays) || normalizedDays <= 0)
    ) {
      setError("Estimated days must be a positive number");
      return;
    }

    setSubmittingQuote(true);
    setError("");
    setNotice("");

    try {
      const result = await createStoreOrderQuote(order._id, {
        priceAmount: normalizedPrice,
        estimatedDays: normalizedDays,
        note: note.trim() || undefined,
      });
      setOrder(result);
      setNotice("Quote saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quote");
    } finally {
      setSubmittingQuote(false);
    }
  }

  function handleDeliveryFileChange(event: ChangeEvent<HTMLInputElement>) {
    setDeliveryFile(event.target.files?.[0] ?? null);
  }

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !canUploadDelivery || !deliveryFile) {
      return;
    }

    setUploadingDelivery(true);
    setError("");
    setNotice("");

    try {
      const result = await deliverStoreOrder(order._id, deliveryFile);
      setOrder(result);
      setDeliveryFile(null);
      setNotice("Delivery file uploaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload delivery file");
    } finally {
      setUploadingDelivery(false);
    }
  }

  async function handleStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !nextStatus) {
      return;
    }

    setUpdatingStatus(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateStoreOrderStatus(order._id, {
        status: nextStatus,
        note: statusNote.trim() || undefined,
      });
      setOrder(updated);
      const nextOptions = STAFF_STATUS_TRANSITIONS[updated.status] ?? [];
      setNextStatus(nextOptions[0] ?? "");
      setStatusNote("");
      setNotice(`Order status updated to ${formatOrderStatus(updated.status)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/staff/store/orders"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Back to orders
              </Link>
              {order ? (
                <Badge className={`rounded-full px-3 py-1 ${getStatusTone(order.status)}`}>
                  {formatOrderStatus(order.status)}
                </Badge>
              ) : null}
            </div>
            <StaffStoreNav />
          </div>
        </MotionDiv>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading order detail" />
          </div>
        ) : null}

        {error && !order ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {order ? (
          <>
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
            >
              <Card>
                <CardHeader>
                  <Badge className="w-fit">Store order detail</Badge>
                  <CardTitle className="text-2xl">{order.orderNumber}</CardTitle>
                  <CardDescription>
                    {getOrderKind(order)} | Created {formatDateTime(order.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Total</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {formatCurrency(order.total, order.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Quote</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {order.quote?.priceAmount
                        ? formatCurrency(order.quote.priceAmount, order.currency)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      Delivery files
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {order.deliveryFiles?.length ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>

            {notice ? (
              <Card className="border-emerald-200 bg-emerald-50/80">
                <CardContent className="p-4 text-sm text-emerald-700">{notice}</CardContent>
              </Card>
            ) : null}

            {error ? (
              <Card className="border-rose-200 bg-rose-50/80">
                <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
              </Card>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Order timeline</CardTitle>
                    <CardDescription>Status changes from backend history.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(order.statusHistory?.length ? order.statusHistory : [])
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
                      )
                      .map((entry) => (
                        <div
                          key={`${entry.to}-${entry.changedAt}`}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatOrderStatus(entry.to)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(entry.changedAt)}
                            </p>
                          </div>
                          {entry.note ? (
                            <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                          ) : null}
                        </div>
                      ))}
                    {!order.statusHistory?.length ? (
                      <p className="text-sm text-slate-500">No timeline data available.</p>
                    ) : null}
                  </CardContent>
                </Card>
              </MotionDiv>

              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Quote and delivery</CardTitle>
                    <CardDescription>
                      Staff can create quote, update status by allowed transition, and upload delivery.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {order.quote ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Current quote</p>
                        <p className="mt-1">
                          Amount: {formatCurrency(order.quote.priceAmount, order.currency)}
                        </p>
                        <p>Estimated days: {order.quote.estimatedDays ?? "-"}</p>
                        <p className="whitespace-pre-line">Note: {order.quote.note || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Quoted at {formatDateTime(order.quote.quotedAt)}
                        </p>
                      </div>
                    ) : null}

                    {canEditQuote ? (
                      <form onSubmit={handleQuoteSubmit} className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700" htmlFor="priceAmount">
                            Quote amount
                          </label>
                          <Input
                            id="priceAmount"
                            type="number"
                            min="1"
                            step="1"
                            value={priceAmount}
                            onChange={(event) => setPriceAmount(event.target.value)}
                            placeholder="250000"
                            disabled={submittingQuote}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700" htmlFor="estimatedDays">
                            Estimated days
                          </label>
                          <Input
                            id="estimatedDays"
                            type="number"
                            min="1"
                            step="1"
                            value={estimatedDays}
                            onChange={(event) => setEstimatedDays(event.target.value)}
                            placeholder="3"
                            disabled={submittingQuote}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700" htmlFor="note">
                            Note
                          </label>
                          <Textarea
                            id="note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Scope, revision count, source file details..."
                            disabled={submittingQuote}
                            rows={4}
                          />
                        </div>
                        <Button type="submit" disabled={submittingQuote}>
                          {submittingQuote ? "Saving..." : "Save quote"}
                        </Button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        Quote editing is only available for custom orders in pending or quoted status.
                      </div>
                    )}

                    {canUploadDelivery ? (
                      <form onSubmit={handleDeliverySubmit} className="space-y-3">
                        <div className="space-y-1.5">
                          <label
                            className="text-sm font-medium text-slate-700"
                            htmlFor="deliveryFile"
                          >
                            Delivery file
                          </label>
                          <Input
                            id="deliveryFile"
                            type="file"
                            onChange={handleDeliveryFileChange}
                            disabled={uploadingDelivery}
                          />
                        </div>
                        <Button type="submit" disabled={uploadingDelivery || !deliveryFile}>
                          {uploadingDelivery ? "Uploading..." : "Upload delivery file"}
                        </Button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        Delivery upload is available for paid, processing, or delivered orders.
                      </div>
                    )}

                    {(STAFF_STATUS_TRANSITIONS[order.status] ?? []).length > 0 ? (
                      <form onSubmit={handleStatusUpdate} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-900">Status update</p>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700" htmlFor="nextStatus">
                            Next status
                          </label>
                          <select
                            id="nextStatus"
                            value={nextStatus}
                            onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none"
                            disabled={updatingStatus}
                          >
                            {(STAFF_STATUS_TRANSITIONS[order.status] ?? []).map((status) => (
                              <option key={status} value={status}>
                                {formatOrderStatus(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700" htmlFor="statusNote">
                            Note (optional)
                          </label>
                          <Textarea
                            id="statusNote"
                            value={statusNote}
                            onChange={(event) => setStatusNote(event.target.value)}
                            rows={3}
                            placeholder="Reason/context for this status update"
                            disabled={updatingStatus}
                          />
                        </div>
                        <Button type="submit" disabled={updatingStatus || !nextStatus}>
                          {updatingStatus ? "Updating..." : "Apply status update"}
                        </Button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        No manual status transition is available for current state.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </MotionDiv>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Order items</CardTitle>
                    <CardDescription>Each item is shown with pricing and product type.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.productSlug}`}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <Badge>{item.productType}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.quantity} x {formatCurrency(item.unitPrice, item.currency)}
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          Line total: {formatCurrency(item.lineTotal, item.currency)}
                        </p>
                        {item.customData ? (
                          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                            {getSafeJson(item.customData)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </MotionDiv>

              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery files</CardTitle>
                    <CardDescription>Latest uploaded file and metadata.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.deliveryFiles?.length ? (
                      order.deliveryFiles
                        .slice()
                        .reverse()
                        .map((file) => (
                          <div
                            key={`${file.objectName}-${file.uploadedAt}`}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <p className="font-semibold text-slate-900">{file.fileName}</p>
                            <p className="text-sm text-slate-600">
                              Uploaded {formatDateTime(file.uploadedAt)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {file.mimeType || "unknown type"} | {file.bucketName}
                            </p>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-slate-500">No delivery files uploaded yet.</p>
                    )}
                  </CardContent>
                </Card>
              </MotionDiv>
            </div>

            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Custom order data</CardTitle>
                  <CardDescription>
                    Raw custom request payload from the first custom-order item.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {order.items.find((item) => item.productType === "custom_order")?.customData ? (
                    <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {getSafeJson(
                        order.items.find((item) => item.productType === "custom_order")?.customData,
                      )}
                    </pre>
                  ) : (
                    <p className="text-sm text-slate-500">No custom data attached to this order.</p>
                  )}
                </CardContent>
              </Card>
            </MotionDiv>
          </>
        ) : null}
      </MotionSection>
    </main>
  );
}
