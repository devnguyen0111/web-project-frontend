export type Role = "guest" | "author" | "staff" | "admin";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  scope: "blog" | "store" | "wiki" | "all";
  postCount: number;
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  usageCount: number;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
}

export interface Post {
  _id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  content: string;
  categoryId?: string;
  tags: string[];
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  views: number;
  likesCount: number;
  bookmarksCount: number;
  commentsCount: number;
  poll?: Poll;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
  depth: number;
  likesCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor | null;
}
