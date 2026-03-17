import { apiRequest } from "@/lib/api/http";
import type { AuthUser, PaginatedResult } from "@/lib/types";

interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
}

export async function getMyProfile() {
  const response = await apiRequest<AuthUser>("/users/me", {
    method: "GET",
  });

  return response.data;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const response = await apiRequest<AuthUser>("/users/me", {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function uploadMyAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<AuthUser>("/users/me/avatar", {
    method: "PATCH",
    body: formData,
  });

  return response.data;
}

export async function listUsers(page = 1, limit = 10) {
  const response = await apiRequest<PaginatedResult<AuthUser>>(
    `/users?page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
  );

  return response.data;
}
