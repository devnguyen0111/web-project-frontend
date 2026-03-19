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
  billingCycle: BillingCycle;
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
  signature?: string;
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

export type StoreProductType = "digital" | "custom_order";
export type StoreProductStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "rejected"
  | "archived";

export type StoreCustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "file";

export type StoreOrderStatus =
  | "pending"
  | "paid"
  | "quoted"
  | "quote_accepted"
  | "processing"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refund_requested"
  | "refunded"
  | "disputed";

export interface StoreProductImage {
  url: string;
  alt?: string;
  order?: number;
}

export interface StoreProductFile {
  filename: string;
  storagePath: string;
  size: number;
  mimeType?: string;
  version?: number;
  uploadedAt: string;
}

export interface StoreProductCustomField {
  _id?: string;
  label: string;
  type: StoreCustomFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface StoreProductEstimatedDays {
  min: number;
  max: number;
}

export interface StoreProductSubscriberDiscount {
  pro: number;
  vip: number;
}

export interface StoreProduct {
  id?: string;
  _id: string;
  sellerId: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: StoreProductImage[];
  previewUrl?: string;
  type: StoreProductType;
  files: StoreProductFile[];
  customFields?: StoreProductCustomField[];
  estimatedDays?: StoreProductEstimatedDays;
  price: number;
  originalPrice?: number;
  isOnSale?: boolean;
  saleEndsAt?: string;
  categoryId?: string;
  tags?: string[];
  salesCount?: number;
  rating?: number;
  reviewsCount?: number;
  viewsCount?: number;
  favoritesCount?: number;
  status: StoreProductStatus;
  reviewedBy?: string;
  rejectionReason?: string;
  stock?: number;
  maxPerUser?: number;
  isFeatured?: boolean;
  subscriberDiscount?: StoreProductSubscriberDiscount;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrderProductSnapshot {
  name: string;
  type: StoreProductType;
  price: number;
  image?: string;
  slug?: string;
  originalPrice?: number;
  shortDescription?: string;
}

export interface StoreOrderItem {
  productId: string;
  productSnapshot: StoreOrderProductSnapshot;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  customData?: Record<string, unknown>;
}

export interface StoreOrderQuote {
  price: number;
  estimatedDays?: number;
  note?: string;
  quotedAt?: string;
  acceptedAt?: string;
}

export interface StoreOrderDeliveryFile {
  filename: string;
  storagePath: string;
  size: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface StoreOrderStatusHistoryEntry {
  from?: StoreOrderStatus;
  to: StoreOrderStatus;
  note?: string;
  changedBy?: string;
  changedAt: string;
}

export interface StoreOrderRefund {
  reason?: string;
  requestedAt?: string;
  processedBy?: string;
  processedAt?: string;
  amount?: number;
}

export interface StoreOrder {
  id?: string;
  _id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  items: StoreOrderItem[];
  subtotal: number;
  platformFee: number;
  totalAmount: number;
  sellerReceives: number;
  buyerTransactionId?: string;
  sellerTransactionId?: string;
  status: StoreOrderStatus;
  quote?: StoreOrderQuote;
  deliveryFiles?: StoreOrderDeliveryFile[];
  deliveredAt?: string;
  completedAt?: string;
  autoCompleteAt?: string;
  statusHistory?: StoreOrderStatusHistoryEntry[];
  buyerNote?: string;
  managerNote?: string;
  adminNote?: string;
  cancelReason?: string;
  refund?: StoreOrderRefund;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  productId: string;
  quantity?: number;
  customData?: Record<string, unknown>;
  buyerNote?: string;
}

export interface CancelOrderPayload {
  reason?: string;
}

export interface RejectQuotePayload {
  reason?: string;
}

export interface StoreProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: StoreProductType | string;
  categoryId?: string;
  status?: StoreProductStatus | string;
}

export interface StoreOrdersQuery {
  page?: number;
  limit?: number;
  status?: StoreOrderStatus | string;
}

export interface StoreCartProductSnapshot {
  name: string;
  slug?: string;
  type?: StoreProductType;
  price?: number;
  originalPrice?: number;
  image?: string;
  shortDescription?: string;
}

export interface StoreCartItem {
  id?: string;
  _id?: string;
  productId: string;
  product?: StoreProduct | null;
  productSnapshot?: StoreCartProductSnapshot | StoreOrderProductSnapshot;
  productName?: string;
  productSlug?: string;
  productType?: StoreProductType;
  productImage?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  lineTotal?: number;
  available?: boolean;
  selected?: boolean;
  customData?: Record<string, unknown>;
  buyerNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreCartSummary {
  itemCount: number;
  selectedCount: number;
  subtotal: number;
  selectedSubtotal?: number;
  currency?: string;
}

export interface StoreCart {
  id?: string;
  _id?: string;
  userId?: string;
  items: StoreCartItem[];
  summary?: StoreCartSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCartItemPayload {
  productId: string;
  quantity?: number;
  customData?: Record<string, unknown>;
  buyerNote?: string;
}

export interface UpdateCartItemPayload {
  quantity?: number;
  selected?: boolean;
  customData?: Record<string, unknown>;
  buyerNote?: string;
}

export interface CheckoutCartPayload {
  itemIds?: string[];
  selectedItemIds?: string[];
  buyerNote?: string;
  idempotencyKey?: string;
}

export interface StoreCartCheckoutItemResult {
  itemId?: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  quantity: number;
  status: "success" | "failed";
  message?: string;
  reason?: string;
  orderId?: string;
  orderNumber?: string;
  subtotal?: number;
  totalAmount?: number;
}

export interface StoreCartCheckoutResult {
  message?: string;
  cart?: StoreCart;
  order?: StoreOrder;
  orders?: StoreOrder[];
  createdOrders?: StoreOrder[];
  successItems?: StoreCartCheckoutItemResult[];
  failedItems?: StoreCartCheckoutItemResult[];
  backendFailedItems?: StoreCartCheckoutFailedItem[];
  summary?: StoreCartCheckoutSummary;
  selectedCount?: number;
  subtotal?: number;
  totalAmount?: number;
  currency?: string;
  checkoutUrl?: string;
}

export interface StoreCartCheckoutFailedItem {
  itemId: string;
  productId?: string;
  quantity: number;
  reason: string;
}

export interface StoreCartCheckoutSummary {
  itemCount: number;
  selectedCount: number;
  subtotal: number;
  successCount: number;
  failedCount: number;
}

export interface StoreCartCheckoutBackendResponse {
  createdOrders: StoreOrder[];
  failedItems: StoreCartCheckoutFailedItem[];
  summary: StoreCartCheckoutSummary;
}

export interface OrderDownloadLinkResponse {
  url?: string;
  downloadUrl?: string;
  signedUrl?: string;
  expiresAt?: string;
  file?: StoreOrderDeliveryFile;
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
