import { apiRequest } from "@/lib/api/http";
import type {
  PaginatedResult,
  WikiArticle,
  WikiCategory,
  WikiHelpfulVote,
  WikiHelpfulVoteResponse,
} from "@/lib/types";

export interface WikiListQuery {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function listWikiArticles(query: WikiListQuery = {}) {
  const response = await apiRequest<PaginatedResult<WikiArticle>>(
    `/wiki${buildQuery({
      page: query.page,
      limit: query.limit,
      q: query.q,
      categoryId: query.categoryId,
    })}`,
    {
      method: "GET",
      skipAuth: true,
    },
  );

  return response.data;
}

export async function listWikiCategories() {
  const response = await apiRequest<WikiCategory[]>("/wiki/categories", {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function getWikiArticleBySlug(slug: string) {
  const response = await apiRequest<WikiArticle>(`/wiki/${slug}`, {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function voteWikiHelpful(articleId: string, value: WikiHelpfulVote) {
  const response = await apiRequest<WikiHelpfulVoteResponse>(
    `/wiki/${articleId}/helpful`,
    {
      method: "POST",
      body: { value },
    },
  );

  return response.data;
}
