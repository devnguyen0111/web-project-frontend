import { apiRequest } from "@/lib/api/http";
import type {
  Order,
  OrderStatus,
  PaginatedResult,
  StoreDashboardSummary,
  StoreProduct,
} from "@/lib/types";

export interface StoreOrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface CreateStoreOrderQuotePayload {
  priceAmount: number;
  estimatedDays?: number;
  note?: string;
}

export interface UpdateStoreOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export interface RejectPendingProductPayload {
  reason?: string;
}

export interface UpsertStoreProductPayload {
  name: string;
  description?: string;
  type?: "digital" | "custom_order";
  priceAmount: number;
  currency?: string;
  stock?: number;
  categoryId?: string;
  vipOnly?: boolean;
}

function buildQuery(params: StoreOrderListQuery = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listStoreOrders(query: StoreOrderListQuery = {}) {
  const response = await apiRequest<PaginatedResult<Order>>(
    `/store/orders${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getStoreDashboardSummary() {
  const response = await apiRequest<StoreDashboardSummary>("/store/dashboard", {
    method: "GET",
  });

  return response.data;
}

export async function listPendingReviewProducts(page = 1, limit = 20) {
  const response = await apiRequest<PaginatedResult<StoreProduct>>(
    `/store/products/pending-review${buildQuery({ page, limit })}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function approvePendingProduct(productId: string) {
  const response = await apiRequest<StoreProduct>(`/store/products/${productId}/approve`, {
    method: "POST",
  });

  return response.data;
}

export async function rejectPendingProduct(
  productId: string,
  payload: RejectPendingProductPayload = {},
) {
  const response = await apiRequest<StoreProduct>(`/store/products/${productId}/reject`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listManagedProducts(page = 1, limit = 20) {
  const response = await apiRequest<PaginatedResult<StoreProduct>>(
    `/products/me${buildQuery({ page, limit })}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function createManagedProduct(payload: UpsertStoreProductPayload) {
  const response = await apiRequest<StoreProduct>("/products", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function updateManagedProduct(
  productId: string,
  payload: Partial<UpsertStoreProductPayload>,
) {
  const response = await apiRequest<StoreProduct>(`/products/${productId}`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function archiveManagedProduct(productId: string) {
  const response = await apiRequest<StoreProduct>(`/products/${productId}`, {
    method: "DELETE",
  });

  return response.data;
}

export async function uploadManagedProductFile(productId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<StoreProduct>(`/products/${productId}/file`, {
    method: "POST",
    body: formData,
  });

  return response.data;
}

export async function submitManagedProductForReview(productId: string) {
  const response = await apiRequest<StoreProduct>(`/products/${productId}/submit-review`, {
    method: "POST",
  });

  return response.data;
}

export async function getStoreOrderDetail(orderId: string) {
  const response = await apiRequest<Order>(`/orders/${orderId}`, {
    method: "GET",
  });

  return response.data;
}

export async function createStoreOrderQuote(
  orderId: string,
  payload: CreateStoreOrderQuotePayload,
) {
  const response = await apiRequest<Order>(`/store/orders/${orderId}/quote`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function deliverStoreOrder(orderId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<Order>(`/store/orders/${orderId}/deliver`, {
    method: "POST",
    body: formData,
  });

  return response.data;
}

export async function updateStoreOrderStatus(
  orderId: string,
  payload: UpdateStoreOrderStatusPayload,
) {
  const response = await apiRequest<Order>(`/store/orders/${orderId}/status`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}
