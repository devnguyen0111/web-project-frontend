import { apiRequest } from "@/lib/api/http";
import type {
  AdminStats,
  AggregationGroupBy,
  AuditLogFilters,
  AuditLogItem,
  PaginatedResult,
  RevenueSeriesResponse,
  UsersGrowthSeriesResponse,
} from "@/lib/types";

interface AggregationQuery {
  from?: string;
  to?: string;
  groupBy?: AggregationGroupBy;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getAdminStats() {
  const response = await apiRequest<AdminStats>("/admin/dashboard/stats", {
    method: "GET",
  });

  return response.data;
}

export async function getAdminRevenue(query: AggregationQuery = {}) {
  const response = await apiRequest<RevenueSeriesResponse>(
    `/admin/dashboard/revenue${buildQuery(
      query as Record<string, string | number | undefined>,
    )}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getAdminUsersGrowth(query: AggregationQuery = {}) {
  const response = await apiRequest<UsersGrowthSeriesResponse>(
    `/admin/dashboard/users-growth${buildQuery(
      query as Record<string, string | number | undefined>,
    )}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const response = await apiRequest<PaginatedResult<AuditLogItem>>(
    `/admin/audit-logs${buildQuery(filters as Record<string, string | number | undefined>)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}
