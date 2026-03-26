import { describe, expect, it } from "vitest";
import { applyTicketUpdate, mergeTicketMessages } from "@/lib/realtime/tickets-state";
import type { Ticket, TicketDetail, TicketMessage } from "@/lib/types";

const baseTicket: Ticket = {
  id: "ticket-1",
  ticketNumber: "TK-20260326-ABCDEF",
  createdBy: "user-1",
  subject: "Need support",
  category: "general",
  priority: "medium",
  status: "open",
  sla: {
    firstResponseDue: "2026-03-26T10:00:00.000Z",
    resolutionDue: "2026-03-27T10:00:00.000Z",
  },
  tags: [],
  isEscalated: false,
  messagesCount: 1,
  lastMessageBy: "user",
};

function buildMessage(id: string, createdAt: string): TicketMessage {
  return {
    id,
    ticketId: "ticket-1",
    content: `Message ${id}`,
    attachments: [],
    isInternal: false,
    isSystem: false,
    createdAt,
  };
}

describe("tickets realtime state", () => {
  it("appends new message only once by id", () => {
    const first = buildMessage("m-1", "2026-03-26T10:00:00.000Z");
    const duplicate = buildMessage("m-1", "2026-03-26T10:01:00.000Z");
    const second = buildMessage("m-2", "2026-03-26T10:02:00.000Z");

    const withDuplicate = mergeTicketMessages([first], duplicate);
    expect(withDuplicate).toHaveLength(1);

    const withSecond = mergeTicketMessages(withDuplicate, second);
    expect(withSecond).toHaveLength(2);
    expect(withSecond.map((item) => item.id)).toEqual(["m-1", "m-2"]);
  });

  it("replaces ticket state when ticket-updated event arrives", () => {
    const detail: TicketDetail = {
      ticket: baseTicket,
      messages: [buildMessage("m-1", "2026-03-26T10:00:00.000Z")],
    };
    const updatedTicket: Ticket = {
      ...baseTicket,
      status: "in_progress",
      assignedTo: "staff-1",
    };

    const next = applyTicketUpdate(detail, updatedTicket);

    expect(next.ticket.status).toBe("in_progress");
    expect(next.ticket.assignedTo).toBe("staff-1");
    expect(next.messages).toHaveLength(1);
  });
});
