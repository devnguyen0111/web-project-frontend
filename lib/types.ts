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
  wallet: UserWallet;
  subscription: UserSubscription;
  postQuota: UserPostQuota;
  createdAt: string;
  updatedAt: string;
}

export interface UserWallet {
  balance: number;
  frozenBalance: number;
  totalEarned: number;
  totalSpent: number;
  lifetimeDeposit: number;
}

export type SubscriptionPlanCode = "free" | "pro" | "vip";
export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "expired";

export interface SubscriptionPerks {
  rewardBonusPercent: number;
  storeDiscountPercent: number;
  prioritySupport: string;
  exclusiveAccess: string;
  profileBadge: string;
  uploadLimitMb: number;
  featuredProfile: boolean;
  comingSoon: boolean;
}

export interface UserSubscription {
  planCode: SubscriptionPlanCode;
  planName: string;
  basePostLimit: number;
  extraPosts: number;
  monthlyPriceCoins: number;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  postsUsedInPeriod: number;
  renewedAt: string;
  nextRenewalAt?: string;
  renewalFailedAt?: string;
  gracePeriodEndsAt?: string;
  reminder7dSentAt?: string;
  reminder3dSentAt?: string;
}

export interface UserPostQuota {
  allowedPosts: number;
  usedPosts: number;
  remainingPosts: number;
  exhausted: boolean;
}

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  rank: number;
  extraPosts: number;
  monthlyPriceCoins: number;
  monthlyPostLimit: number;
  perks: SubscriptionPerks;
  cyclePricing: {
    monthly: CyclePriceInfo;
    quarterly: CyclePriceInfo;
    yearly: CyclePriceInfo;
  };
}

export interface CyclePriceInfo {
  monthlyPriceCoins: number;
  cyclePriceCoins: number;
  months: number;
  discountRate: number;
  discountPercent: number;
}

export interface SubscriptionOverview {
  subscription: UserSubscription;
  quota: UserPostQuota;
  plans: SubscriptionPlan[];
  activePerks?: SubscriptionPerks;
}

export interface RenewSubscriptionPayload {
  planCode: SubscriptionPlanCode | string;
  billingCycle?: BillingCycle;
  months?: number;
  idempotencyKey?: string;
}

export interface SubscriptionHistoryItem {
  id?: string;
  _id: string;
  type: string;
  status: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  planCode?: string;
  billingCycle?: BillingCycle;
  totalCostCoins?: number | null;
  months?: number | null;
}

export type WalletTransactionDirection = "credit" | "debit";
export type WalletTransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "reversed";
export type WalletTransactionType =
  | "deposit"
  | "subscription"
  | "sale_income"
  | "post_reward"
  | "referral_bonus"
  | "refund_buyer"
  | "refund_store"
  | "platform_fee"
  | "admin_adjust"
  | "withdrawal"
  | "purchase"
  | "refund";
export type PaymentProvider = "payos";

export interface WalletSummary {
  id?: string;
  _id?: string;
  userId?: string;
  balance: number;
  frozenBalance?: number;
  totalEarned?: number;
  lifetimeDeposit?: number;
  availableBalance?: number;
  pendingBalance?: number;
  totalDeposited?: number;
  totalSpent?: number;
  totalAdjusted?: number;
  transactionCount?: number;
  currency?: string;
  lastTransactionAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id?: string;
  _id: string;
  walletId?: string;
  userId?: string;
  amount: number;
  direction?: WalletTransactionDirection;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  provider?: PaymentProvider | string;
  reference?: string;
  reason?: string;
  note?: string;
  description?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface CreateDepositRequestPayload {
  amount: number;
  amountReal?: number;
  exchangeRate?: number;
  currency?: string;
  provider?: PaymentProvider;
}

export interface CreateDepositRequestResponse {
  paymentUrl?: string;
  redirectUrl?: string;
  checkoutUrl?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  reference?: string;
  transaction?: WalletTransaction;
  message?: string;
}

export type PayosReturnStatus =
  | "success"
  | "pending"
  | "failed"
  | "cancelled"
  | "verifying"
  | "unknown";

export interface PayosReturnStatusQuery {
  orderCode?: string;
  paymentLinkId?: string;
  id?: string;
  status?: string;
  cancel?: string | boolean;
  code?: string;
}

export interface PayosReturnTransactionInfo {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amountReal: number;
  currency: string;
  coinAmount: number;
  paymentMethod: string;
  provider: PaymentProvider;
  orderCode?: string;
  paymentLinkId?: string;
  checkoutUrl?: string;
  createdAt?: string;
  confirmedAt?: string;
  failedAt?: string;
  balanceBefore: number;
  balanceAfter: number;
  failureReason?: string;
}

export interface PayosWalletTopupInfo {
  coinAmount: number;
  amountReal: number;
  currency: string;
  exchangeRate: number;
  balanceBefore: number;
  balanceAfter: number;
  walletTransactionId: string;
  note: string;
}

export interface PayosReturnStatusResponse {
  provider: PaymentProvider;
  status: PayosReturnStatus;
  message: string;
  hints: {
    status?: string;
    code?: string;
    cancel: boolean;
  };
  transaction?: PayosReturnTransactionInfo;
  walletTopup?: PayosWalletTopupInfo;
}

export interface AdminWalletAdjustPayload {
  userId: string;
  amount: number;
  direction: WalletTransactionDirection;
  reason: string;
  note?: string;
}

export interface AdminWalletAdjustResponse {
  message?: string;
  wallet?: WalletSummary;
  transaction?: WalletTransaction;
  balance?: number;
}

export type NotificationCategory = "subscription";
export type NotificationType =
  | "subscription_reminder"
  | "subscription_renewed"
  | "subscription_failed"
  | "subscription_expired";

export interface NotificationItem {
  id?: string;
  _id: string;
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
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
