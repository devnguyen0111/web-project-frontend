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
  followersCount?: number;
  followingCount?: number;
  wallet: UserWallet;
  subscription: UserSubscription;
  postQuota: UserPostQuota;
  twoFactor?: UserTwoFactorState;
  gamification?: UserGamificationState;
  createdAt: string;
  updatedAt: string;
}

export interface UserTwoFactorState {
  enabled: boolean;
  enabledAt?: string;
  lastVerifiedAt?: string;
}

export interface UserGamificationState {
  xp: number;
  level: number;
  xpToNextLevel: number;
  postsPublished: number;
  salesCount: number;
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
  coinToVndRate?: number;
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
  reference?: string | Record<string, unknown>;
  reason?: string;
  note?: string;
  description?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, unknown>;
  externalPayment?: {
    provider?: PaymentProvider | string;
    externalId?: string;
    orderCode?: string | number;
    paymentLinkId?: string;
    checkoutUrl?: string;
    amountReal?: number;
    currency?: string;
    exchangeRate?: number;
  };
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
  idempotencyKey?: string;
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

export type NotificationCategory =
  | "subscription"
  | "ticket"
  | "blog"
  | "store"
  | "wallet"
  | "gamification"
  | "social";
export type NotificationType =
  | "subscription_reminder"
  | "subscription_renewed"
  | "subscription_failed"
  | "subscription_expired"
  | "ticket_created"
  | "ticket_reply"
  | "ticket_assigned"
  | "ticket_status_changed"
  | "blog_post_approved"
  | "blog_post_rejected"
  | "store_order_created"
  | "store_quote_created"
  | "store_quote_accepted"
  | "store_quote_rejected"
  | "store_delivery_uploaded"
  | "store_order_completed"
  | "store_order_auto_completed"
  | "wallet_deposit_completed"
  | "wallet_deposit_failed"
  | "wallet_deposit_cancelled"
  | "wallet_admin_adjusted"
  | "badge_earned";

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

export interface AuthLoginSuccessPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  requiresTwoFactor?: false;
}

export interface AuthTwoFactorChallengePayload {
  requiresTwoFactor: true;
  twoFactorToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export type AuthPayload = AuthLoginSuccessPayload | AuthTwoFactorChallengePayload;

export interface TwoFactorEnableResponse {
  setupToken: string;
  otpAuthUrl: string;
  manualEntryKey: string;
  expiresInSeconds: number;
}

export interface TwoFactorVerifyPayload {
  token: string;
  code?: string;
  backupCode?: string;
}

export interface TwoFactorLoginVerifyResponse extends AuthLoginSuccessPayload {
  requiresTwoFactor: false;
}

export interface TwoFactorSetupVerifyResponse {
  message: string;
  backupCodes: string[];
  user: AuthUser;
}

export interface TwoFactorDisablePayload {
  password: string;
  code?: string;
  backupCode?: string;
}

export interface TwoFactorDisableResponse {
  message: string;
  user: AuthUser;
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

export type StoreProductType = "digital" | "custom_order";
export type StoreProductStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "rejected"
  | "archived";

export interface StoreProductDigitalAsset {
  bucketName: string;
  objectName: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  etag?: string;
  uploadedAt?: string;
}

export interface StoreProductMetrics {
  soldCount: number;
  averageRating: number;
  reviewCount: number;
}

export interface StoreProduct {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  type: StoreProductType;
  status?: StoreProductStatus;
  priceAmount: number;
  currency: string;
  stock?: number;
  categoryId?: string;
  vipOnly?: boolean;
  metrics?: StoreProductMetrics;
  digitalAsset?: StoreProductDigitalAsset;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderQuote {
  priceAmount: number;
  estimatedDays?: number;
  note?: string;
  quotedAt: string;
  quotedBy?: string;
  acceptedAt?: string;
}

export interface OrderDeliveryFile {
  _id?: string;
  bucketName: string;
  objectName: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  etag?: string;
  uploadedAt: string;
  uploadedBy?: string;
  fromProductAsset: boolean;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "quoted"
  | "quote_accepted"
  | "processing"
  | "delivered"
  | "completed"
  | "cancelled";

export type OrderSource = "buy_now" | "cart";

export interface OrderItem {
  _id?: string;
  productId: string;
  productName: string;
  productSlug: string;
  productType: StoreProductType;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: string;
  digitalAsset?: StoreProductDigitalAsset;
  customData?: Record<string, unknown>;
}

export interface OrderStatusHistoryEntry {
  to: OrderStatus;
  from?: OrderStatus;
  note?: string;
  changedBy?: string;
  changedAt: string;
}

export interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  buyerId: string;
  sellerId?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  platformFee?: number;
  sellerReceives?: number;
  currency: string;
  status: OrderStatus;
  source: OrderSource;
  quote?: OrderQuote;
  deliveryFiles: OrderDeliveryFile[];
  deliveryEmailLogs?: Array<{
    fileObjectName: string;
    status: string;
    claimedAt: string;
    sentAt?: string;
  }>;
  statusHistory?: OrderStatusHistoryEntry[];
  idempotencyKey?: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  autoCompleteAt?: string;
  settledAt?: string;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderActionTicketLink {
  ticketId: string;
  ticketNumber: string;
  appended?: boolean;
}

export interface OrderActionResponse {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  requestType: "cancel" | "refund";
  reason: string;
  ticket: OrderActionTicketLink;
}

export interface StoreDashboardSummary {
  totalOrders: number;
  paidOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  grossRevenue: number;
  ordersLast7Days: number;
}

export type ReviewTargetType = "product" | "store";

export interface ReviewAspects {
  quality?: number;
  delivery?: number;
  communication?: number;
}

export interface ReviewReply {
  message: string;
  repliedBy: string;
  repliedAt: string;
}

export interface Review {
  _id: string;
  id?: string;
  targetType: ReviewTargetType;
  productId?: string;
  reviewerId: string;
  verifiedPurchase?: boolean;
  rating: number;
  aspects?: ReviewAspects;
  content?: string;
  staffReply?: ReviewReply;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductReviewPayload {
  rating: number;
  qualityRating?: number;
  deliveryRating?: number;
  communicationRating?: number;
  content?: string;
}

export interface CreateStoreReviewPayload {
  rating: number;
  content?: string;
}

export interface ReplyReviewPayload {
  message: string;
}

export interface CartItem {
  _id: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: string;
}

export interface Cart {
  _id?: string;
  id?: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutResult {
  order: Order;
  cart: Cart;
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
  | "code"
  | "divider"
  | "embed"
  | "callout"
  | "todo";

export type PostListStyle = "ordered" | "unordered";
export type PostImageSize = "small" | "medium" | "large";
export type PostEmbedProvider = "youtube" | "twitter";
export type PostCalloutTone = "info" | "success" | "warning" | "danger";

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

export interface PostDividerBlock {
  id?: string;
  type: "divider";
}

export interface PostEmbedBlock {
  id?: string;
  type: "embed";
  provider: PostEmbedProvider;
  embedUrl: string;
}

export interface PostCalloutBlock {
  id?: string;
  type: "callout";
  tone?: PostCalloutTone;
  text: string;
}

export interface PostTodoItem {
  text: string;
  checked?: boolean;
}

export interface PostTodoBlock {
  id?: string;
  type: "todo";
  todoItems: PostTodoItem[];
}

export type PostBlock =
  | PostParagraphBlock
  | PostHeadingBlock
  | PostQuoteBlock
  | PostListBlock
  | PostImageBlock
  | PostCodeBlock
  | PostDividerBlock
  | PostEmbedBlock
  | PostCalloutBlock
  | PostTodoBlock;

export interface PostAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string;
  level?: number;
}

export interface Post {
  _id: string;
  authorId: string;
  author?: PostAuthor | null;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  isExclusive?: boolean;
  isFeatured?: boolean;
  isPinned?: boolean;
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

export interface BlogPostFlags {
  isExclusive: boolean;
  isFeatured: boolean;
  isPinned: boolean;
}

export interface BlogPostMetrics {
  views: number;
  likesCount: number;
  commentsCount: number;
  readTimeMinutes: number;
  rewardCoins?: number;
}

export interface BlogPostCardV2 {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  flags: BlogPostFlags;
  author: PostAuthor;
  metrics: BlogPostMetrics;
  publishedAt?: string;
}

export interface BlogPostAccess {
  locked: boolean;
  reason?: "vip_required";
  upgradeUrl: "/subscription";
}

export interface BlogTableOfContentsItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface BlogPostDetailV2 {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  flags: BlogPostFlags;
  author: PostAuthor;
  metrics: BlogPostMetrics & {
    bookmarksCount: number;
  };
  access: BlogPostAccess;
  blocks: PostBlock[];
  toc: BlogTableOfContentsItem[];
  poll?: Poll;
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

export interface NotificationsReadyEvent {
  userId: string;
  unreadCount: number;
  connectedAt: string;
}

export interface NotificationsNewEvent {
  notification: NotificationItem;
}

export interface NotificationsUnreadCountEvent {
  unreadCount: number;
}

export interface NotificationsReadEvent {
  id: string;
  readAt: string;
}

export interface NotificationsReadAllEvent {
  updated: number;
  readAt: string;
}

export interface NotificationsErrorEvent {
  message: string;
}

export type TicketCategory =
  | "order_issue"
  | "payment"
  | "product_quality"
  | "refund"
  | "custom_order"
  | "account"
  | "store_report"
  | "bug_report"
  | "feature_request"
  | "general";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus =
  | "open"
  | "awaiting_user"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "closed"
  | "reopened";
export type TicketLastMessageBy = "user" | "staff";
export type TicketRelatedType = "order" | "product" | "wallet" | "account";

export interface TicketRelatedRef {
  type: TicketRelatedType;
  id: string;
}

export interface TicketSla {
  firstResponseDue: string;
  resolutionDue: string;
}

export interface TicketSatisfaction {
  rating?: number;
  comment?: string;
  ratedAt?: string;
}

export interface TicketMessageAttachment {
  fileName: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  content: string;
  attachments: TicketMessageAttachment[];
  isInternal: boolean;
  isSystem: boolean;
  systemEvent?: string;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  createdBy: string;
  assignedTo?: string;
  relatedTo?: TicketRelatedRef;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  sla: TicketSla;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfaction?: TicketSatisfaction;
  tags: string[];
  isEscalated: boolean;
  escalatedTo?: string;
  messagesCount: number;
  lastMessageAt?: string;
  lastMessageBy: TicketLastMessageBy;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketAssignee {
  id: string;
  fullName: string;
  role: Extract<Role, "staff" | "admin">;
}

export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
}

export interface TicketsReadyEvent {
  userId: string;
  connectedAt: string;
}

export interface TicketsSubscribedEvent {
  ticketId: string;
  subscribedAt: string;
}

export interface TicketsMessageEvent {
  ticketId: string;
  message: TicketMessage;
}

export interface TicketsUpdatedEvent {
  ticket: Ticket;
}

export interface TicketsErrorEvent {
  message: string;
}

export interface CreateTicketPayload {
  subject: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  relatedTo?: TicketRelatedRef;
  message: string;
  attachments?: TicketMessageAttachment[];
  tags?: string[];
}

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  relatedType?: TicketRelatedType;
  relatedId?: string;
  assignedTo?: string;
  createdBy?: string;
  q?: string;
}

export interface AdminTicketAssignPayload {
  assignedTo: string;
}

export interface AdminTicketUpdateStatusPayload {
  status: TicketStatus;
  note?: string;
  escalatedTo?: string;
}

export interface AdminTicketInternalNotePayload {
  content: string;
  attachments?: TicketMessageAttachment[];
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  content: {
    postsTotal: number;
    postsPublished: number;
    postsPending: number;
    productsTotal: number;
    productsActive: number;
    productsPending: number;
  };
  commerce: {
    ordersTotal: number;
    revenueTrackedOrders: number;
    transactionsTotal: number;
    depositsCompleted: number;
  };
  support: {
    ticketsTotal: number;
    ticketsOpen: number;
  };
  generatedAt: string;
}

export type AggregationGroupBy = "day" | "week" | "month";

export interface RevenueSeriesPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface RevenueSeriesResponse {
  from: string;
  to: string;
  groupBy: AggregationGroupBy;
  totalRevenue: number;
  totalOrders: number;
  series: RevenueSeriesPoint[];
}

export interface UsersGrowthSeriesPoint {
  period: string;
  newUsers: number;
  totalUsers: number;
}

export interface UsersGrowthSeriesResponse {
  from: string;
  to: string;
  groupBy: AggregationGroupBy;
  baseCount: number;
  series: UsersGrowthSeriesPoint[];
}

export type AuditSeverity = "info" | "warning" | "error";

export interface AuditLogItem {
  _id: string;
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  method: string;
  route: string;
  action: string;
  target?: string;
  statusCode: number;
  severity: AuditSeverity;
  errorMessage?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  severity?: AuditSeverity;
  userId?: string;
  from?: string;
  to?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  gamification: UserGamificationState;
}

export interface FollowUserItem {
  userId: string;
  followedAt: string;
  fullName?: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
  gamification: UserGamificationState;
}

export interface FollowMutationResponse {
  following: boolean;
  created?: boolean;
  removed?: boolean;
}

export interface BadgeCriteria {
  type: "posts_published" | "sales_count" | "level_reached";
  threshold: number;
}

export interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
  criteria: BadgeCriteria;
  xpReward: number;
}

export interface MyBadgeItem {
  id: string;
  awardedAt: string;
  badge?: BadgeItem;
}

export type WikiArticleStatus = "draft" | "published" | "archived";
export type WikiRequiredTier = "pro" | "vip";
export type WikiHelpfulVote = "yes" | "no";

export interface WikiBreadcrumbItem {
  articleId: string;
  title: string;
  slug: string;
}

export interface WikiArticle {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId?: string;
  tags: string[];
  parentArticleId?: string;
  order: number;
  breadcrumb: WikiBreadcrumbItem[];
  version: number;
  lastEditedBy?: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  status: WikiArticleStatus;
  isPublic: boolean;
  requiredTier?: WikiRequiredTier;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WikiCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  parentId?: string;
  articleCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WikiHelpfulVoteResponse {
  articleId: string;
  helpfulYes: number;
  helpfulNo: number;
  value: WikiHelpfulVote;
}
