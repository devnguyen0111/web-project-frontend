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
  isEmailVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  message: string;
  requiresEmailVerification: boolean;
  user: AuthUser;
}

export interface VerifyEmailResponse {
  message: string;
  user: AuthUser;
}

export type CategoryScope = "blog" | "store" | "wiki" | "all";

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  scope: CategoryScope;
  icon?: string;
  color?: string;
  coverImage?: string;
  parentId?: string;
  order: number;
  postCount: number;
  productCount?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  usageCount: number;
  isApproved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  isPermanent?: boolean;
  endsAt?: string;
}

export type PostBlockType =
  | "paragraph"
  | "heading"
  | "quote"
  | "list"
  | "image"
  | "code";

export type PostListStyle = "ordered" | "unordered";
export type PostImageSize = "small" | "medium" | "large";

export interface PostParagraphBlock {
  id?: string;
  type: "paragraph";
  text: string;
}

export interface PostHeadingBlock {
  id?: string;
  type: "heading";
  text: string;
  level: 1 | 2 | 3 | 4;
}

export interface PostQuoteBlock {
  id?: string;
  type: "quote";
  text: string;
}

export interface PostListBlock {
  id?: string;
  type: "list";
  style: PostListStyle;
  items: string[];
}

export interface PostImageBlock {
  id?: string;
  type: "image";
  url: string;
  alt?: string;
  caption?: string;
  size?: PostImageSize;
}

export interface PostCodeBlock {
  id?: string;
  type: "code";
  code: string;
  language?: string;
}

export type PostBlock =
  | PostParagraphBlock
  | PostHeadingBlock
  | PostQuoteBlock
  | PostListBlock
  | PostImageBlock
  | PostCodeBlock;

export interface PostAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

export interface Post {
  _id: string;
  authorId: string;
  author?: PostAuthor | null;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  blocks?: PostBlock[];
  searchText?: string;
  categoryId?: string;
  tags: string[];
  status: "draft" | "pending" | "published" | "rejected" | "archived";
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  bookmarks?: string[];
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
  id?: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
  depth: number;
  likesCount: number;
  isEdited: boolean;
  isDeleted?: boolean;
  isHidden: boolean;
  hiddenBy?: string;
  hideReason?: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor | null;
}
