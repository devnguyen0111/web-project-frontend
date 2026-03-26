import { apiRequest } from "@/lib/api/http";
import type {
  AdminTicketAssignPayload,
  AdminTicketInternalNotePayload,
  AdminTicketUpdateStatusPayload,
  CreateTicketPayload,
  PaginatedResult,
  Ticket,
  TicketAssignee,
  TicketDetail,
  TicketMessage,
  TicketMessageAttachment,
  TicketQueryParams,
} from "@/lib/types";

type CreateTicketMessagePayload = {
  content: string;
  attachments?: TicketMessageAttachment[];
};

type CloseTicketPayload = {
  reason?: string;
};

type ReopenTicketPayload = {
  reason?: string;
};

type RateTicketPayload = {
  rating: number;
  comment?: string;
};

function buildQuery(params: TicketQueryParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function createTicket(payload: CreateTicketPayload) {
  const response = await apiRequest<TicketDetail>("/tickets", {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listMyTickets(query: TicketQueryParams = {}) {
  const response = await apiRequest<PaginatedResult<Ticket>>(
    `/tickets/me${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function getTicketDetail(ticketId: string) {
  const response = await apiRequest<TicketDetail>(`/tickets/${ticketId}`, {
    method: "GET",
  });

  return response.data;
}

export async function addTicketMessage(
  ticketId: string,
  payload: CreateTicketMessagePayload,
) {
  const response = await apiRequest<TicketMessage>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function closeTicket(ticketId: string, payload: CloseTicketPayload = {}) {
  const response = await apiRequest<Ticket>(`/tickets/${ticketId}/close`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function reopenTicket(
  ticketId: string,
  payload: ReopenTicketPayload = {},
) {
  const response = await apiRequest<Ticket>(`/tickets/${ticketId}/reopen`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function rateTicket(ticketId: string, payload: RateTicketPayload) {
  const response = await apiRequest<Ticket>(`/tickets/${ticketId}/rate`, {
    method: "POST",
    body: payload,
  });

  return response.data;
}

export async function listAdminTickets(query: TicketQueryParams = {}) {
  const response = await apiRequest<PaginatedResult<Ticket>>(
    `/admin/tickets${buildQuery(query)}`,
    {
      method: "GET",
    },
  );

  return response.data;
}

export async function listTicketAssignees() {
  const response = await apiRequest<TicketAssignee[]>("/admin/tickets/assignees", {
    method: "GET",
  });

  return response.data;
}

export async function assignAdminTicket(
  ticketId: string,
  payload: AdminTicketAssignPayload,
) {
  const response = await apiRequest<Ticket>(`/admin/tickets/${ticketId}/assign`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function updateAdminTicketStatus(
  ticketId: string,
  payload: AdminTicketUpdateStatusPayload,
) {
  const response = await apiRequest<Ticket>(`/admin/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: payload,
  });

  return response.data;
}

export async function createAdminTicketInternalNote(
  ticketId: string,
  payload: AdminTicketInternalNotePayload,
) {
  const response = await apiRequest<TicketMessage>(
    `/admin/tickets/${ticketId}/internal-note`,
    {
      method: "POST",
      body: payload,
    },
  );

  return response.data;
}
