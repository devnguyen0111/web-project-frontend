import { apiRequest } from "@/lib/api/http";
import type {
  AdminWalletAdjustPayload,
  AdminWalletAdjustResponse,
  CreateDepositRequestPayload,
  CreateDepositRequestResponse,
  PaginatedResult,
  PayosReturnStatusQuery,
  PayosReturnStatusResponse,
  WalletSummary,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@/lib/types";

interface WalletTransactionsQuery {
  page?: number;
  limit?: number;
  status?: WalletTransactionStatus | string;
  type?: WalletTransactionType | string;
}

function buildQuery(params: WalletTransactionsQuery = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

const WALLET_ENDPOINTS = {
  summary: "/wallet/me",
  transactions: "/wallet/me/transactions",
  depositRequests: "/wallet/deposit-requests",
  adminAdjust: "/admin/wallet/adjust",
} as const;

export async function getMyWalletSummary() {
  const response = await apiRequest<WalletSummary>(WALLET_ENDPOINTS.summary, {
    method: "GET",
  });

  return response.data;
}

export async function listMyWalletTransactions(query: WalletTransactionsQuery = {}) {
  const response = await apiRequest<PaginatedResult<WalletTransaction>>(
    `${WALLET_ENDPOINTS.transactions}${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function createDepositRequest(payload: CreateDepositRequestPayload) {
  const response = await apiRequest<CreateDepositRequestResponse>(
    WALLET_ENDPOINTS.depositRequests,
    {
      method: "POST",
      body: {
        coinAmount: payload.amount,
        amount: payload.amount,
        amountReal: payload.amountReal,
        exchangeRate: payload.exchangeRate,
        currency: payload.currency,
        provider: payload.provider ?? "payos",
      },
    },
  );

  return response.data;
}

export async function getDepositRequest(transactionId: string) {
  const response = await apiRequest<WalletTransaction>(
    `${WALLET_ENDPOINTS.depositRequests}/${transactionId}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function cancelDepositRequest(transactionId: string, reason?: string) {
  const response = await apiRequest<WalletTransaction>(
    `${WALLET_ENDPOINTS.depositRequests}/${transactionId}/cancel`,
    {
      method: "POST",
      body: reason ? { reason } : {},
    },
  );

  return response.data;
}

export async function adjustWalletForAdmin(payload: AdminWalletAdjustPayload) {
  const response = await apiRequest<AdminWalletAdjustResponse>(
    WALLET_ENDPOINTS.adminAdjust,
    {
      method: "POST",
      body: payload,
    },
  );

  return response.data;
}

function buildPublicQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) {
      searchParams.set(key, value.trim());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function syncPayosReturnStatus(payload: PayosReturnStatusQuery) {
  const { signature, ...body } = payload;
  const response = await apiRequest<Record<string, unknown>>(
    "/payment/payos/return-sync",
    {
      method: "POST",
      body,
      headers: signature
        ? { "x-payment-signature": signature }
        : undefined,
      cache: "no-store",
    },
  );

  return response.data;
}

export async function getPayosReturnStatus(query: PayosReturnStatusQuery) {
  const queryString = buildPublicQuery({
    orderCode: query.orderCode,
    paymentLinkId: query.paymentLinkId ?? query.id,
    id: query.id,
    status: query.status,
    cancel:
      query.cancel === undefined
        ? undefined
        : typeof query.cancel === "boolean"
          ? String(query.cancel)
          : query.cancel,
    code: query.code,
    signature: query.signature,
  });

  const response = await apiRequest<PayosReturnStatusResponse>(
    `/payment/payos/return-status${queryString}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.data;
}
