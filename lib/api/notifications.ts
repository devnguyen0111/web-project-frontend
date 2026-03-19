import { apiRequest } from "@/lib/api/http";
import type { NotificationItem, PaginatedResult } from "@/lib/types";

export async function listMyNotifications(query: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (query.page) {
    searchParams.set("page", String(query.page));
  }
  if (query.limit) {
    searchParams.set("limit", String(query.limit));
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const response = await apiRequest<PaginatedResult<NotificationItem>>(
    `/notifications/me${suffix}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getMyNotificationUnreadCount() {
  const response = await apiRequest<{ unreadCount: number }>(
    "/notifications/me/unread-count",
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiRequest<NotificationItem>(
    `/notifications/me/${notificationId}/read`,
    {
      method: "POST",
    },
  );

  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await apiRequest<{ updated: number }>(
    "/notifications/me/read-all",
    {
      method: "POST",
    },
  );

  return response.data;
}
