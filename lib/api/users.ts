import { apiRequest } from "@/lib/api/http";
import type { AuthUser, PaginatedResult, Role } from "@/lib/types";

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

interface UpdateUserRolePayload {
  role: Role;
}

export async function updateUserRole(userId: string, payload: UpdateUserRolePayload) {
  const response = await apiRequest<AuthUser>(`/users/${userId}/role`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

interface UpdateUserStatusPayload {
  isActive: boolean;
}

export async function updateUserStatus(userId: string, payload: UpdateUserStatusPayload) {
  const response = await apiRequest<AuthUser>(`/users/${userId}/status`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

interface UpdateUserByAdminPayload {
  fullName?: string;
  email?: string;
  isEmailVerified?: boolean;
}

export async function updateUserByAdmin(
  userId: string,
  payload: UpdateUserByAdminPayload,
) {
  const response = await apiRequest<AuthUser>(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}
