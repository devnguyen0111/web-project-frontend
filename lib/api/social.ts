import { apiRequest } from "@/lib/api/http";
import type {
  FollowMutationResponse,
  FollowUserItem,
  LeaderboardEntry,
  PaginatedResult,
} from "@/lib/types";

interface PaginationQuery {
  page?: number;
  limit?: number;
}

function buildQuery(params: PaginationQuery = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getLeaderboard(query: PaginationQuery = {}) {
  const response = await apiRequest<PaginatedResult<LeaderboardEntry>>(
    `/users/leaderboard${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function followUser(userId: string) {
  const response = await apiRequest<FollowMutationResponse>(`/users/${userId}/follow`, {
    method: "POST",
  });

  return response.data;
}

export async function unfollowUser(userId: string) {
  const response = await apiRequest<FollowMutationResponse>(`/users/${userId}/follow`, {
    method: "DELETE",
  });

  return response.data;
}

export async function getUserFollowers(userId: string, query: PaginationQuery = {}) {
  const response = await apiRequest<PaginatedResult<FollowUserItem>>(
    `/users/${userId}/followers${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getUserFollowing(userId: string, query: PaginationQuery = {}) {
  const response = await apiRequest<PaginatedResult<FollowUserItem>>(
    `/users/${userId}/following${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}
