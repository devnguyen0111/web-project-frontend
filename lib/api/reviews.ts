import { apiRequest } from "@/lib/api/http";
import type {
  CreateProductReviewPayload,
  CreateStoreReviewPayload,
  PaginatedResult,
  ReplyReviewPayload,
  Review,
} from "@/lib/types";

function buildQuery(page = 1, limit = 20) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  return `?${searchParams.toString()}`;
}

export async function listProductReviews(
  productId: string,
  query: { page?: number; limit?: number } = {},
) {
  const response = await apiRequest<PaginatedResult<Review>>(
    `/products/${productId}/reviews${buildQuery(query.page ?? 1, query.limit ?? 20)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function createProductReview(
  productId: string,
  payload: CreateProductReviewPayload,
) {
  const response = await apiRequest<Review>(`/products/${productId}/reviews`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listStoreReviews(query: { page?: number; limit?: number } = {}) {
  const response = await apiRequest<PaginatedResult<Review>>(
    `/store/reviews${buildQuery(query.page ?? 1, query.limit ?? 20)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function createStoreReview(payload: CreateStoreReviewPayload) {
  const response = await apiRequest<Review>("/store/reviews", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function replyReview(reviewId: string, payload: ReplyReviewPayload) {
  const response = await apiRequest<Review>(`/reviews/${reviewId}/reply`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}
