import { apiRequest } from "@/lib/api/http";
import type {
  AddCartItemPayload,
  CancelOrderPayload,
  CheckoutCartPayload,
  CreateOrderPayload,
  StoreCartSummary,
  StoreCart,
  StoreCartCheckoutBackendResponse,
  StoreCartCheckoutResult,
  StoreCartItem,
  OrderDownloadLinkResponse,
  PaginatedResult,
  StoreOrder,
  StoreOrdersQuery,
  StoreProduct,
  StoreProductsQuery,
  RejectQuotePayload,
  UpdateCartItemPayload,
} from "@/lib/types";

function buildQuery(params: object) {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, string | number | boolean | undefined>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    },
  );

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeCartItem(item: StoreCartItem): StoreCartItem {
  const resolvedId = item._id ?? item.id ?? "";
  const quantity = Math.max(1, Math.floor(item.quantity || 1));
  const unitPrice = item.unitPrice ?? item.product?.price ?? item.productSnapshot?.price ?? 0;
  const totalPrice = item.totalPrice ?? item.lineTotal ?? unitPrice * quantity;

  return {
    ...item,
    id: resolvedId || item.id,
    _id: resolvedId || item._id,
    quantity,
    unitPrice,
    totalPrice,
    selected: item.selected ?? true,
  };
}

function normalizeCartSummary(items: StoreCartItem[], summary?: StoreCartSummary): StoreCartSummary {
  const subtotal =
    typeof summary?.subtotal === "number"
      ? summary.subtotal
      : items.reduce((total, item) => total + (item.totalPrice ?? 0), 0);

  const selectedSubtotal = items.reduce((total, item) => {
    if (item.selected ?? true) {
      return total + (item.totalPrice ?? 0);
    }
    return total;
  }, 0);

  return {
    itemCount: summary?.itemCount ?? items.reduce((total, item) => total + item.quantity, 0),
    selectedCount:
      summary?.selectedCount ?? items.filter((item) => item.selected ?? true).length,
    subtotal,
    selectedSubtotal:
      typeof summary?.selectedSubtotal === "number"
        ? summary.selectedSubtotal
        : selectedSubtotal,
    currency: summary?.currency ?? "coin",
  };
}

function normalizeCart(cart?: StoreCart): StoreCart {
  const items = (cart?.items ?? []).map(normalizeCartItem);

  return {
    ...cart,
    items,
    summary: normalizeCartSummary(items, cart?.summary),
  };
}

export async function listProducts(query: StoreProductsQuery = {}) {
  const response = await apiRequest<PaginatedResult<StoreProduct>>(
    `/products${buildQuery(query)}`,
    {
      method: "GET",
      skipAuth: true,
    },
  );

  return response.data;
}

export async function getProductBySlug(slug: string) {
  const response = await apiRequest<StoreProduct>(`/products/${slug}`, {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await apiRequest<StoreOrder>("/orders", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listMyOrders(query: StoreOrdersQuery = {}) {
  const response = await apiRequest<PaginatedResult<StoreOrder>>(
    `/orders/me${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getOrderById(id: string) {
  const response = await apiRequest<StoreOrder>(`/orders/${id}`, {
    method: "GET",
  });

  return response.data;
}

export async function cancelOrder(id: string, reason?: string) {
  const response = await apiRequest<StoreOrder>(`/orders/${id}/cancel`, {
    method: "POST",
    body: reason ? { reason } : ({} as CancelOrderPayload),
  });

  return response.data;
}

export async function getOrderDownloadLink(id: string) {
  const response = await apiRequest<OrderDownloadLinkResponse | string>(
    `/orders/${id}/download`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function acceptOrderQuote(id: string) {
  const response = await apiRequest<StoreOrder>(`/orders/${id}/quote/accept`, {
    method: "POST",
  });

  return response.data;
}

export async function rejectOrderQuote(id: string, payload: RejectQuotePayload = {}) {
  const response = await apiRequest<StoreOrder>(`/orders/${id}/quote/reject`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function getMyCart() {
  const response = await apiRequest<StoreCart | undefined>("/cart/me", {
    method: "GET",
  });

  return normalizeCart(response.data);
}

export async function addCartItem(payload: AddCartItemPayload) {
  const response = await apiRequest<StoreCart | undefined>("/cart/items", {
    method: "POST",
    body: payload,
  });

  return normalizeCart(response.data);
}

export async function updateCartItem(itemId: string, payload: UpdateCartItemPayload) {
  const response = await apiRequest<StoreCart | undefined>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: payload,
  });

  return normalizeCart(response.data);
}

export async function removeCartItem(itemId: string) {
  const response = await apiRequest<StoreCart | undefined>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });

  return normalizeCart(response.data);
}

export async function clearMyCart() {
  const response = await apiRequest<StoreCart | undefined>("/cart/me/clear", {
    method: "POST",
  });

  return normalizeCart(response.data);
}

export async function checkoutCart(payload: CheckoutCartPayload) {
  const itemIds =
    payload.itemIds && payload.itemIds.length > 0
      ? payload.itemIds
      : payload.selectedItemIds;

  const response = await apiRequest<StoreCartCheckoutBackendResponse | undefined>(
    "/cart/me/checkout",
    {
      method: "POST",
      body: itemIds?.length ? { itemIds } : {},
    },
  );

  const checkoutData = response.data;
  if (!checkoutData) {
    return undefined;
  }

  let cart: StoreCart | undefined;
  try {
    cart = await getMyCart();
  } catch {
    cart = undefined;
  }

  const successItems = (checkoutData.createdOrders ?? []).map((order) => {
    const firstItem = order.items?.[0];
    return {
      itemId: firstItem?.productId,
      productId: firstItem?.productId ?? "",
      productName: firstItem?.productSnapshot?.name,
      productSlug: firstItem?.productSnapshot?.slug,
      quantity: firstItem?.quantity ?? 1,
      status: "success" as const,
      message: "Order created successfully.",
      orderId: order.id ?? order._id,
      orderNumber: order.orderNumber,
      subtotal: firstItem?.subtotal,
      totalAmount: order.totalAmount,
    };
  });

  const failedItems = (checkoutData.failedItems ?? []).map((item) => ({
    itemId: item.itemId,
    productId: item.productId ?? "",
    quantity: item.quantity,
    status: "failed" as const,
    reason: item.reason,
    message: item.reason,
  }));

  const message =
    successItems.length > 0
      ? `Checkout completed with ${successItems.length} successful item(s).`
      : "Checkout failed for all selected items.";

  const result: StoreCartCheckoutResult = {
    message,
    cart,
    orders: checkoutData.createdOrders,
    successItems,
    failedItems,
    selectedCount: checkoutData.summary?.selectedCount,
    subtotal: checkoutData.summary?.subtotal,
    totalAmount: checkoutData.summary?.subtotal,
    currency: "coin",
    summary: checkoutData.summary,
    createdOrders: checkoutData.createdOrders,
    backendFailedItems: checkoutData.failedItems,
  };

  return result;
}
