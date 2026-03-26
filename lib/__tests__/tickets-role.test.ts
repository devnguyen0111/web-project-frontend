import { describe, expect, it } from "vitest";
import {
  canOwnerCloseTicket,
  canOwnerRateTicket,
  canOwnerReopenTicket,
  isTicketOwner,
  isTicketStaffRole,
} from "@/lib/tickets-role";

describe("tickets role access helpers", () => {
  it("detects staff/admin role", () => {
    expect(isTicketStaffRole("staff")).toBe(true);
    expect(isTicketStaffRole("admin")).toBe(true);
    expect(isTicketStaffRole("author")).toBe(false);
    expect(isTicketStaffRole(undefined)).toBe(false);
  });

  it("detects ticket ownership correctly", () => {
    expect(isTicketOwner("u1", "u1")).toBe(true);
    expect(isTicketOwner("u1", "u2")).toBe(false);
    expect(isTicketOwner(undefined, "u1")).toBe(false);
  });

  it("allows close action only for owner and non-closed status", () => {
    expect(canOwnerCloseTicket("open", true)).toBe(true);
    expect(canOwnerCloseTicket("closed", true)).toBe(false);
    expect(canOwnerCloseTicket("open", false)).toBe(false);
  });

  it("allows reopen action only for owner in closed or resolved states", () => {
    expect(canOwnerReopenTicket("closed", true)).toBe(true);
    expect(canOwnerReopenTicket("resolved", true)).toBe(true);
    expect(canOwnerReopenTicket("in_progress", true)).toBe(false);
    expect(canOwnerReopenTicket("closed", false)).toBe(false);
  });

  it("allows rating only once for owner in resolved states", () => {
    expect(canOwnerRateTicket("closed", true, false)).toBe(true);
    expect(canOwnerRateTicket("resolved", true, false)).toBe(true);
    expect(canOwnerRateTicket("closed", true, true)).toBe(false);
    expect(canOwnerRateTicket("open", true, false)).toBe(false);
    expect(canOwnerRateTicket("closed", false, false)).toBe(false);
  });
});
