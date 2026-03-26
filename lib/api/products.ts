import { apiRequest } from "@/lib/api/http";
import type {
  Category,
  PaginatedResult,
  StoreProduct,
  StoreProductType,
} from "@/lib/types";

export type ProductSortBy =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular"
  | "rating";

export interface ListStoreProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: StoreProductType;
  categoryId?: string;
  vipOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: ProductSortBy;
}

function buildQuery(query: ListStoreProductsQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listStoreProducts(query: ListStoreProductsQuery = {}) {
  const response = await apiRequest<PaginatedResult<StoreProduct>>(
    `/products${buildQuery(query)}`,
    {
      method: "GET",
      skipAuth: true,
    },
  );

  return response.data;
}

export async function listStoreCategories() {
  const response = await apiRequest<Category[]>("/categories?scope=store", {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function getStoreProduct(identifier: string) {
  const response = await apiRequest<StoreProduct>(`/products/${identifier}`, {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export const listProducts = listStoreProducts;
export const getProductDetail = getStoreProduct;
export const getStoreProductDetail = getStoreProduct;
