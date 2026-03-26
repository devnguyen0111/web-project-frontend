import { apiRequest } from "@/lib/api/http";
import type {
  Order,
  OrderActionResponse,
  OrderStatus,
  PaginatedResult,
} from "@/lib/types";

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface CreateOrderPayload {
  productId: string;
  quantity: number;
  idempotencyKey?: string;
  customData?: Record<string, unknown>;
}

export interface AcceptOrderQuotePayload {
  idempotencyKey?: string;
}

export interface RejectOrderQuotePayload {
  reason?: string;
}

export interface RequestOrderActionPayload {
  reason?: string;
}

export interface OrderDownloadResponse {
  orderId: string;
  fileId?: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  expiresInSeconds: number;
  downloadUrl: string;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await apiRequest<Order>("/orders", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listMyOrders(query: OrderListQuery = {}) {
  const response = await apiRequest<PaginatedResult<Order>>(
    `/orders/me${buildQuery({
      page: query.page,
      limit: query.limit,
      status: query.status,
    })}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getOrderDetail(orderId: string) {
  const response = await apiRequest<Order>(`/orders/${orderId}`, {
    method: "GET",
  });

  return response.data;
}

export async function acceptOrderQuote(
  orderId: string,
  payload: AcceptOrderQuotePayload = {},
) {
  const response = await apiRequest<Order>(`/orders/${orderId}/quote/accept`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function rejectOrderQuote(
  orderId: string,
  payload: RejectOrderQuotePayload = {},
) {
  const response = await apiRequest<Order>(`/orders/${orderId}/quote/reject`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function getOrderDownloadLink(orderId: string, fileId?: string) {
  const response = await apiRequest<OrderDownloadResponse>(
    `/orders/${orderId}/download${buildQuery({ fileId })}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function completeOrder(orderId: string) {
  const response = await apiRequest<Order>(`/orders/${orderId}/complete`, {
    method: "POST",
  });

  return response.data;
}

export async function requestCancelOrder(
  orderId: string,
  payload: RequestOrderActionPayload = {},
) {
  const response = await apiRequest<OrderActionResponse>(
    `/orders/${orderId}/cancel`,
    {
      method: "POST",
      body: payload,
    },
  );

  return response.data;
}

export async function requestOrderRefund(
  orderId: string,
  payload: RequestOrderActionPayload = {},
) {
  const response = await apiRequest<OrderActionResponse>(
    `/orders/${orderId}/refund-request`,
    {
      method: "POST",
      body: payload,
    },
  );

  return response.data;
}
