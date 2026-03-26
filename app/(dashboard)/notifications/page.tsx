"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { getAccessToken } from "@/lib/api/token-store";
import {
  getMyNotificationUnreadCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { connectNotificationsSocket } from "@/lib/realtime/notifications-socket";
import type { NotificationItem } from "@/lib/types";

function resolveNotificationId(item: NotificationItem) {
  return item.id ?? item._id;
}

function nowIsoString() {
  return new Date().toISOString();
}

function resolveTicketId(item: NotificationItem): string | null {
  const ticketId = item.metadata?.ticketId;
  return typeof ticketId === "string" && ticketId.trim() ? ticketId : null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");

  async function loadInitial() {
    const [listResult, unreadResult] = await Promise.all([
      listMyNotifications({ page: 1, limit: 30 }),
      getMyNotificationUnreadCount(),
    ]);
    setItems(listResult.data);
    setUnreadCount(unreadResult.unreadCount);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadInitial();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load notifications");
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

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setConnectionState("unauthenticated");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | null = null;

    setConnectionState("connecting");
    void (async () => {
      try {
        cleanup = await connectNotificationsSocket({
          getToken: () => getAccessToken(),
          onReady: (payload) => {
            setConnectionState("connected");
            setUnreadCount(payload.unreadCount);
          },
          onNew: (payload) => {
            const normalized = {
              ...payload.notification,
              id: payload.notification.id ?? payload.notification._id,
              _id: payload.notification._id ?? payload.notification.id ?? "",
            };
            setItems((prev) => {
              const key = resolveNotificationId(normalized);
              if (prev.some((item) => resolveNotificationId(item) === key)) {
                return prev;
              }
              return [normalized, ...prev];
            });
          },
          onUnreadCount: (payload) => {
            setUnreadCount(payload.unreadCount);
          },
          onRead: (payload) => {
            setItems((prev) =>
              prev.map((item) =>
                resolveNotificationId(item) === payload.id
                  ? { ...item, readAt: payload.readAt }
                  : item,
              ),
            );
          },
          onReadAll: (payload) => {
            setItems((prev) =>
              prev.map((item) =>
                item.readAt ? item : { ...item, readAt: payload.readAt },
              ),
            );
          },
          onError: (payload) => {
            setConnectionState("error");
            setError(payload.message || "Realtime notification connection failed");
          },
        });
      } catch (err) {
        if (!disposed) {
          setConnectionState("error");
          setError(err instanceof Error ? err.message : "Failed to connect realtime");
        }
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  async function handleMarkRead(notificationId: string) {
    const timestamp = nowIsoString();
    setItems((prev) =>
      prev.map((item) =>
        resolveNotificationId(item) === notificationId && !item.readAt
          ? { ...item, readAt: timestamp }
          : item,
      ),
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));

    try {
      await markNotificationRead(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification");
      await loadInitial();
    }
  }

  async function handleMarkAllRead() {
    const timestamp = nowIsoString();
    setSyncing(true);
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: timestamp })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all notifications");
      await loadInitial();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="w-fit">Notifications</Badge>
                <CardTitle>Notification center</CardTitle>
                <CardDescription>
                  REST + realtime synchronization for unread count and status updates.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{unreadCount} unread</Badge>
                <Badge variant={connectionState === "connected" ? "success" : "warning"}>
                  {connectionState}
                </Badge>
                <Button
                  variant="secondary"
                  onClick={() => void handleMarkAllRead()}
                  disabled={syncing || unreadCount === 0}
                >
                  Mark all read
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner label="Loading notifications" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        {!loading && items.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">
              No notifications yet.
            </CardContent>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const id = resolveNotificationId(item);
              const ticketId = item.category === "ticket" ? resolveTicketId(item) : null;
              return (
                <Card key={id} className={item.readAt ? "" : "border-[var(--info)]"}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{item.message}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="neutral">{item.category}</Badge>
                        <Badge variant="info">{item.type}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ticketId ? (
                        <Link href={`/tickets/${ticketId}`}>
                          <Button variant="secondary">Open ticket</Button>
                        </Link>
                      ) : null}
                      {!item.readAt ? (
                        <Button
                          variant="secondary"
                          onClick={() => void handleMarkRead(id)}
                          disabled={syncing}
                        >
                          Mark read
                        </Button>
                      ) : (
                        <Badge variant="success">Read</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
