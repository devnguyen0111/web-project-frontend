import type { Ticket, TicketDetail, TicketMessage } from "@/lib/types";

export function mergeTicketMessages(
  current: TicketMessage[],
  incoming: TicketMessage,
): TicketMessage[] {
  if (current.some((item) => item.id === incoming.id)) {
    return current;
  }

  return [...current, incoming].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });
}

export function applyTicketUpdate(detail: TicketDetail, ticket: Ticket): TicketDetail {
  return {
    ...detail,
    ticket,
  };
}
