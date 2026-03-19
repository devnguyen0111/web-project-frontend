import { apiRequest } from "@/lib/api/http";
import type {
  PaginatedResult,
  RenewSubscriptionPayload,
  SubscriptionHistoryItem,
  SubscriptionOverview,
  SubscriptionPlan,
} from "@/lib/types";

function normalizeHistoryItem(item: SubscriptionHistoryItem): SubscriptionHistoryItem {
  const normalizedId = item.id ?? item._id ?? "";
  return {
    ...item,
    id: normalizedId,
    _id: item._id ?? normalizedId,
  };
}

export async function listSubscriptionPlans() {
  const response = await apiRequest<SubscriptionPlan[]>("/subscriptions/plans", {
    method: "GET",
  });

  return response.data;
}

export async function getMySubscription() {
  const response = await apiRequest<SubscriptionOverview>("/subscriptions/me", {
    method: "GET",
  });

  return response.data;
}

export async function renewMySubscription(payload: RenewSubscriptionPayload) {
  const response = await apiRequest<SubscriptionOverview>(
    "/subscriptions/me/purchase",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.data;
}

export async function setSubscriptionAutoRenew(enabled: boolean) {
  const response = await apiRequest<SubscriptionOverview>(
    "/subscriptions/me/auto-renew",
    {
      method: "POST",
      body: { enabled },
    },
  );

  return response.data;
}

export async function setSubscriptionCancelAtPeriodEnd(cancel = true) {
  const response = await apiRequest<SubscriptionOverview>(
    "/subscriptions/me/cancel-at-period-end",
    {
      method: "POST",
      body: { cancel },
    },
  );

  return response.data;
}

export async function listMySubscriptionHistory(query: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (query.page) {
    searchParams.set("page", String(query.page));
  }
  if (query.limit) {
    searchParams.set("limit", String(query.limit));
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const response = await apiRequest<PaginatedResult<SubscriptionHistoryItem>>(
    `/subscriptions/me/history${suffix}`,
    {
      method: "GET",
    },
  );

  return {
    ...response.data,
    data: response.data.data.map(normalizeHistoryItem),
  };
}
