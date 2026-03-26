import { apiRequest } from "@/lib/api/http";
import type { Cart, CheckoutResult } from "@/lib/types";

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface CheckoutCartPayload {
  idempotencyKey?: string;
}

const CART_BASE_PATH = "/cart";

export async function getMyCart() {
  const response = await apiRequest<Cart>(CART_BASE_PATH, {
    method: "GET",
  });

  return response.data;
}

export async function addCartItem(payload: AddCartItemPayload) {
  const response = await apiRequest<Cart>(`${CART_BASE_PATH}/items`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function updateCartItem(itemId: string, payload: UpdateCartItemPayload) {
  const response = await apiRequest<Cart>(`${CART_BASE_PATH}/items/${itemId}`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function removeCartItem(itemId: string) {
  const response = await apiRequest<Cart>(`${CART_BASE_PATH}/items/${itemId}`, {
    method: "DELETE",
  });

  return response.data;
}

export async function clearCart() {
  const response = await apiRequest<Cart>(CART_BASE_PATH, {
    method: "DELETE",
  });

  return response.data;
}

export async function checkoutCart(payload: CheckoutCartPayload = {}) {
  const response = await apiRequest<CheckoutResult>(`${CART_BASE_PATH}/checkout`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

