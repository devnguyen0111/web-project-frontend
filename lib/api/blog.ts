import { apiRequest } from "@/lib/api/http";
import type {
  Category,
  Comment,
  PaginatedResult,
  Poll,
  PostBlock,
  Post,
  Tag,
} from "@/lib/types";

interface PostsQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  tagId?: string;
  status?: string;
}

interface CreatePostPayload {
  title: string;
  excerpt?: string;
  blocks: PostBlock[];
  categoryId?: string;
  tagIds?: string[];
  poll?: {
    question: string;
    options: Array<{ text: string }>;
    isPermanent?: boolean;
    endsAt?: string;
  };
}

interface UpdatePostPayload {
  title?: string;
  excerpt?: string;
  blocks?: PostBlock[];
  categoryId?: string;
  tagIds?: string[];
  poll?: {
    question: string;
    options: Array<{ text: string }>;
    isPermanent?: boolean;
    endsAt?: string;
  };
}

interface PostLikeStatus {
  liked: boolean;
  likesCount: number;
}

interface UploadedPostImage {
  bucketName: string;
  objectName: string;
  etag: string;
  url: string;
}

const inFlightPostBySlugRequests = new Map<string, Promise<Post>>();

function buildQuery(query: PostsQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listPublishedPosts(query: PostsQuery = {}) {
  const response = await apiRequest<PaginatedResult<Post>>(
    `/posts${buildQuery(query)}`,
    { method: "GET", skipAuth: true },
  );

  return response.data;
}

export async function listMyPosts(query: PostsQuery = {}) {
  const response = await apiRequest<PaginatedResult<Post>>(
    `/posts/me${buildQuery(query)}`,
    { method: "GET" },
  );

  return response.data;
}

export async function getMyPostDetail(postId: string) {
  const response = await apiRequest<Post>(`/posts/me/${postId}`, {
    method: "GET",
  });

  return response.data;
}

export async function getPostBySlug(slug: string) {
  const inFlightRequest = inFlightPostBySlugRequests.get(slug);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    const response = await apiRequest<Post>(`/posts/${slug}`, {
      method: "GET",
      skipAuth: true,
    });

    return response.data;
  })();

  inFlightPostBySlugRequests.set(slug, request);

  try {
    return await request;
  } finally {
    inFlightPostBySlugRequests.delete(slug);
  }
}

export async function createPost(payload: CreatePostPayload) {
  const response = await apiRequest<Post>("/posts", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function updatePost(postId: string, payload: UpdatePostPayload) {
  const response = await apiRequest<Post>(`/posts/${postId}`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function submitPost(postId: string) {
  const response = await apiRequest<Post>(`/posts/${postId}/submit`, {
    method: "POST",
  });

  return response.data;
}

export async function uploadPostCoverImage(postId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<Post>(`/posts/${postId}/cover-image`, {
    method: "POST",
    body: formData,
  });

  return response.data;
}

export async function deletePost(postId: string) {
  const response = await apiRequest<{ message: string }>(`/posts/${postId}`, {
    method: "DELETE",
  });

  return response.data;
}

export async function uploadPostBlockImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<UploadedPostImage>("/posts/block-image", {
    method: "POST",
    body: formData,
  });

  return response.data;
}

export async function togglePostLike(postId: string) {
  const response = await apiRequest<PostLikeStatus>(`/posts/${postId}/like`, {
    method: "POST",
  });

  return response.data;
}

export async function getPostLikeStatus(postId: string) {
  const response = await apiRequest<PostLikeStatus>(
    `/posts/${postId}/like-status`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function votePoll(postId: string, optionIndex: number) {
  const response = await apiRequest<{ voted: boolean }>(
    `/posts/${postId}/poll/vote`,
    {
      method: "POST",
      body: { optionIndex },
    },
  );

  return response.data;
}

export async function getPollResults(postId: string) {
  const response = await apiRequest<Poll>(`/posts/${postId}/poll/results`, {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function listComments(postId: string, page = 1, limit = 20) {
  const response = await apiRequest<PaginatedResult<Comment>>(
    `/posts/${postId}/comments?page=${page}&limit=${limit}`,
    {
      method: "GET",
      skipAuth: true,
    },
  );

  return response.data;
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
) {
  const response = await apiRequest<Comment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: { content, parentId },
  });

  return response.data;
}

export async function listCategories() {
  const response = await apiRequest<Category[]>("/categories?scope=blog", {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function listTags() {
  const response = await apiRequest<Tag[]>("/tags", {
    method: "GET",
    skipAuth: true,
  });

  return response.data;
}

export async function listPendingPosts(page = 1, limit = 10) {
  const response = await apiRequest<PaginatedResult<Post>>(
    `/moderation/posts?page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getPendingPostDetail(postId: string) {
  const response = await apiRequest<Post>(`/moderation/posts/${postId}`, {
    method: "GET",
  });

  return response.data;
}

export async function approvePost(postId: string) {
  const response = await apiRequest<Post>(
    `/moderation/posts/${postId}/approve`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

export async function rejectPost(postId: string, reason: string) {
  const response = await apiRequest<Post>(
    `/moderation/posts/${postId}/reject`,
    {
      method: "PATCH",
      body: { reason },
    },
  );

  return response.data;
}
