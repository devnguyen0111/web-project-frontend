"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
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
import {
  acceptOrderQuote,
  completeOrder,
  getOrderDetail,
  getOrderDownloadLink,
  rejectOrderQuote,
  requestCancelOrder,
  requestOrderRefund,
} from "@/lib/api/orders";
import { createIdempotencyKey } from "@/lib/idempotency";
import type {
  Order,
  OrderActionTicketLink,
  OrderDeliveryFile,
  OrderStatus,
} from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const ORDER_FLOW: OrderStatus[] = [
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

function getOrderId(order: Order | null) {
  return order?.id ?? order?._id ?? "";
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

function getItemTypeLabel(type: Order["items"][number]["productType"]) {
  return type === "digital" ? "Digital" : "Custom order";
}

function renderCustomData(data?: Record<string, unknown>) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return (
    <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function buildTimelineLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "Request created";
    case "paid":
      return "Paid";
    case "quoted":
      return "Quote ready";
    case "quote_accepted":
      return "Quote accepted";
    case "processing":
      return "In progress";
    case "delivered":
      return "Delivered";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = useMemo(() => params?.id ?? "", [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [downloadFileId, setDownloadFileId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionTicket, setActionTicket] = useState<OrderActionTicketLink | null>(null);

  async function loadOrder() {
    if (!orderId) {
      setLoading(false);
      setError("Missing order id");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getOrderDetail(orderId);
      setOrder(data);
      setRejectReason(data.cancelReason ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleAcceptQuote() {
    if (!order) {
      return;
    }

    setAcceptLoading(true);
    setError("");
    setActionMessage("");

    try {
      const updated = await acceptOrderQuote(getOrderId(order), {
        idempotencyKey: createIdempotencyKey("quote-accept"),
      });
      setOrder(updated);
      setActionMessage("Quote accepted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept quote failed");
    } finally {
      setAcceptLoading(false);
    }
  }

  async function handleRejectQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }

    setRejectLoading(true);
    setError("");
    setActionMessage("");

    try {
      const updated = await rejectOrderQuote(getOrderId(order), {
        reason: rejectReason.trim() || "Quote rejected by buyer",
      });
      setOrder(updated);
      setActionMessage("Quote rejected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject quote failed");
    } finally {
      setRejectLoading(false);
    }
  }

  async function handleDownload(file: OrderDeliveryFile) {
    if (!order) {
      return;
    }

    setDownloadFileId(file._id ?? file.objectName);
    setError("");

    try {
      const response = await getOrderDownloadLink(getOrderId(order), file._id);
      window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadFileId(null);
    }
  }

  async function handleCompleteOrder() {
    if (!order) {
      return;
    }

    setCompleteLoading(true);
    setError("");
    setActionMessage("");
    setActionTicket(null);
    try {
      const updated = await completeOrder(getOrderId(order));
      setOrder(updated);
      setActionMessage("Order marked as completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete order failed");
    } finally {
      setCompleteLoading(false);
    }
  }

  async function handleCancelRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }

    setCancelLoading(true);
    setError("");
    setActionMessage("");
    setActionTicket(null);
    try {
      const response = await requestCancelOrder(getOrderId(order), {
        reason: cancelReason.trim() || undefined,
      });
      setActionTicket(response.ticket);
      setActionMessage(
        `Cancel request sent. Ticket ${response.ticket.ticketNumber} is now tracking this case.`,
      );
      setCancelReason("");
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel request failed");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleRefundRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }

    setRefundLoading(true);
    setError("");
    setActionMessage("");
    setActionTicket(null);
    try {
      const response = await requestOrderRefund(getOrderId(order), {
        reason: refundReason.trim() || undefined,
      });
      setActionTicket(response.ticket);
      setActionMessage(
        `Refund request sent. Ticket ${response.ticket.ticketNumber} is now tracking this case.`,
      );
      setRefundReason("");
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund request failed");
    } finally {
      setRefundLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading order detail" />
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell space-y-4">
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
          <Link
            href="/dashboard/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
          >
            Back to orders
          </Link>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">
              Order not found
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const canRespondToQuote = order.status === "quoted" && Boolean(order.quote);
  const deliveryFiles = order.deliveryFiles ?? [];
  const canDownload = deliveryFiles.length > 0 && ["delivered", "completed"].includes(order.status);
  const canCompleteOrder = order.status === "delivered";
  const canRequestCancel = !["cancelled", "completed"].includes(order.status);
  const canRequestRefund = order.status !== "cancelled";
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <MotionDiv
          className="flex flex-wrap items-center justify-between gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: smoothEase }}
        >
          <Link
            href="/dashboard/orders"
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Back to orders
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/tickets?relatedType=order&relatedId=${getOrderId(order)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
            >
              Open ticket
            </Link>
            <Badge variant={getStatusTone(order.status)}>{getStatusLabel(order.status)}</Badge>
          </div>
        </MotionDiv>

        {actionMessage ? (
          <Card className="border-emerald-200 bg-emerald-50/80">
            <CardContent className="space-y-2 p-4 text-sm text-emerald-700">
              <p>{actionMessage}</p>
              {actionTicket ? (
                <Link
                  href={`/tickets/${actionTicket.ticketId}`}
                  className="inline-flex text-xs font-semibold text-emerald-700 underline"
                >
                  Open ticket {actionTicket.ticketNumber}
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Buyer actions</CardTitle>
            <CardDescription>
              Complete delivered order or send cancellation/refund request to support.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Complete order</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Available when order is delivered.
              </p>
              <Button
                onClick={() => void handleCompleteOrder()}
                loading={completeLoading}
                disabled={!canCompleteOrder}
              >
                Mark completed
              </Button>
            </div>

            <form
              className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
              onSubmit={handleCancelRequest}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">Cancel request</p>
              <Textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Reason for cancellation request"
                rows={3}
                disabled={!canRequestCancel || cancelLoading}
              />
              <Button type="submit" variant="danger" loading={cancelLoading} disabled={!canRequestCancel}>
                Send cancel request
              </Button>
            </form>

            <form
              className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
              onSubmit={handleRefundRequest}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">Refund request</p>
              <Textarea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Reason for refund request"
                rows={3}
                disabled={!canRequestRefund || refundLoading}
              />
              <Button type="submit" loading={refundLoading} disabled={!canRequestRefund}>
                Send refund request
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge className="w-fit">{getSourceLabel(order.source)}</Badge>
                    <CardTitle className="mt-2 text-2xl">{order.orderNumber}</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      Total
                    </p>
                    <p className="text-2xl font-semibold text-[var(--text-primary)]">
                      {formatMoney(order.total, order.currency)}
                    </p>
                  </div>
                </div>
                <CardDescription>
                  Order created {formatDateTime(order.createdAt)} | {order.items.length} item
                  {order.items.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      Subtotal
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {formatMoney(order.subtotal, order.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      Quote
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {order.quote ? formatMoney(order.quote.priceAmount, order.currency) : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      Paid at
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {formatDateTime(order.paidAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      Delivered at
                    </p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {formatDateTime(order.deliveredAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Lifecycle</h3>
                  <div className="grid gap-3">
                    {ORDER_FLOW.map((status, index) => {
                      const reached = currentIndex >= index;
                      const history = order.statusHistory?.find((entry) => entry.to === status);
                      return (
                        <div
                          key={status}
                          className={`rounded-2xl border p-4 ${
                            reached
                              ? "border-[var(--primary)] bg-[rgba(8,145,178,0.06)]"
                              : "border-[var(--border)] bg-[var(--surface-muted)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {buildTimelineLabel(status)}
                              </p>
                              {history?.note ? (
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {history.note}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant={reached ? "success" : "neutral"}>
                              {reached ? "Done" : "Pending"}
                            </Badge>
                          </div>
                          {history?.changedAt ? (
                            <p className="mt-2 text-xs text-[var(--text-secondary)]">
                              {formatDateTime(history.changedAt)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: smoothEase }}
          >
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quote</CardTitle>
                  <CardDescription>
                    Review the staff quote and respond if the order is waiting for your
                    approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.quote ? (
                    <>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm">
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Quoted price
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                          {formatMoney(order.quote.priceAmount, order.currency)}
                        </p>
                        {order.quote.estimatedDays ? (
                          <p className="mt-2 text-[var(--text-secondary)]">
                            Estimated delivery: {order.quote.estimatedDays} day
                            {order.quote.estimatedDays > 1 ? "s" : ""}
                          </p>
                        ) : null}
                        {order.quote.note ? (
                          <p className="mt-2 text-[var(--text-secondary)]">{order.quote.note}</p>
                        ) : null}
                      </div>

                      {canRespondToQuote ? (
                        <div className="space-y-3">
                          <Button onClick={handleAcceptQuote} loading={acceptLoading}>
                            Accept quote
                          </Button>
                          <form className="space-y-3" onSubmit={handleRejectQuote}>
                            <Textarea
                              value={rejectReason}
                              onChange={(event) => setRejectReason(event.target.value)}
                              placeholder="Reason for rejecting the quote"
                              rows={4}
                            />
                            <Button
                              type="submit"
                              variant="danger"
                              loading={rejectLoading}
                            >
                              Reject quote
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                          Quote actions are only available while the order is in quoted status.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                      No quote is available yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery files</CardTitle>
                  <CardDescription>
                    Secure downloads appear once the order is delivered or completed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canDownload ? (
                    deliveryFiles.map((file) => (
                      <div
                        key={file._id ?? file.objectName}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {file.fileName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              Uploaded {formatDateTime(file.uploadedAt)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              {file.mimeType || "Unknown type"}
                              {typeof file.size === "number" ? ` • ${file.size} bytes` : ""}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => void handleDownload(file)}
                            loading={downloadFileId === (file._id ?? file.objectName)}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                      Delivery files will appear here after staff uploads them.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </MotionDiv>
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Order items</CardTitle>
              <CardDescription>
                Details from the order payload and any custom request data attached to the item.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {order.items.map((item) => (
                <div
                  key={`${item.productId}-${item.productSlug}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {getItemTypeLabel(item.productType)} | qty {item.quantity}
                      </p>
                    </div>
                    <Badge>{item.productType === "digital" ? "Digital" : "Custom"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Unit price
                      </p>
                      <p className="mt-1 font-semibold text-[var(--text-primary)]">
                        {formatMoney(item.unitPrice, item.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Line total
                      </p>
                      <p className="mt-1 font-semibold text-[var(--text-primary)]">
                        {formatMoney(item.lineTotal, item.currency)}
                      </p>
                    </div>
                  </div>

                  {item.digitalAsset ? (
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      Delivery asset: {item.digitalAsset.fileName}
                    </p>
                  ) : null}

                  {item.customData ? (
                    <div className="mt-4">{renderCustomData(item.customData)}</div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionSection>
    </main>
  );
}
