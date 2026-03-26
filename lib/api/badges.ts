import { apiRequest } from "@/lib/api/http";
import type { BadgeItem, MyBadgeItem } from "@/lib/types";

export async function listBadges() {
  const response = await apiRequest<BadgeItem[]>("/badges", {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function listMyBadges() {
  const response = await apiRequest<MyBadgeItem[]>("/badges/me", {
    method: "GET",
  });

  return response.data;
}
