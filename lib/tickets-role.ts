import type { Role, TicketStatus } from "@/lib/types";

export function isTicketStaffRole(role: Role | string | undefined) {
  return role === "staff" || role === "admin";
}

export function isTicketOwner(userId: string | undefined, createdBy: string | undefined) {
  return Boolean(userId && createdBy && userId === createdBy);
}

export function canOwnerCloseTicket(status: TicketStatus | undefined, isOwner: boolean) {
  return Boolean(isOwner && status && status !== "closed");
}

export function canOwnerReopenTicket(status: TicketStatus | undefined, isOwner: boolean) {
  return Boolean(isOwner && status && (status === "closed" || status === "resolved"));
}

export function canOwnerRateTicket(
  status: TicketStatus | undefined,
  isOwner: boolean,
  hasRating: boolean,
) {
  const isResolvedState = status === "closed" || status === "resolved";
  return Boolean(isOwner && isResolvedState && !hasRating);
}
