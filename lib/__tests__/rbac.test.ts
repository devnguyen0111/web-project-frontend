import { describe, expect, it } from "vitest";
import {
  canAccessDashboard,
  canAccessModeration,
  getHeaderNavModel,
  getNavbarLinks,
  getRoleBadgeVariant,
  getRoleDashboardHref,
} from "@/lib/rbac";

describe("rbac helpers", () => {
  it("allows dashboard for author/staff/admin only", () => {
    expect(canAccessDashboard("guest")).toBe(false);
    expect(canAccessDashboard("author")).toBe(true);
    expect(canAccessDashboard("staff")).toBe(true);
    expect(canAccessDashboard("admin")).toBe(true);
  });

  it("allows moderation for staff/admin only", () => {
    expect(canAccessModeration("guest")).toBe(false);
    expect(canAccessModeration("author")).toBe(false);
    expect(canAccessModeration("staff")).toBe(true);
    expect(canAccessModeration("admin")).toBe(true);
  });

  it("builds navbar links by role", () => {
    expect(getNavbarLinks("guest").map((item) => item.href)).toEqual([
      "/blog",
      "/store",
      "/subscription",
      "/leaderboard",
      "/badges",
    ]);
    expect(getNavbarLinks("author").map((item) => item.href)).toEqual([
      "/blog",
      "/store",
      "/subscription",
      "/leaderboard",
      "/badges",
      "/cart",
      "/dashboard",
      "/dashboard/orders",
      "/tickets",
      "/notifications",
    ]);
    expect(getNavbarLinks("staff").map((item) => item.href)).toEqual([
      "/blog",
      "/store",
      "/subscription",
      "/leaderboard",
      "/badges",
      "/cart",
      "/dashboard",
      "/dashboard/orders",
      "/tickets",
      "/notifications",
      "/staff/store/orders",
      "/staff",
    ]);
    expect(getNavbarLinks("admin").map((item) => item.href)).toEqual([
      "/blog",
      "/store",
      "/subscription",
      "/leaderboard",
      "/badges",
      "/cart",
      "/dashboard",
      "/dashboard/orders",
      "/tickets",
      "/notifications",
      "/staff/store/orders",
      "/admin",
    ]);
  });

  it("returns dashboard href by role", () => {
    expect(getRoleDashboardHref("guest")).toBe("/dashboard");
    expect(getRoleDashboardHref("author")).toBe("/dashboard");
    expect(getRoleDashboardHref("staff")).toBe("/staff");
    expect(getRoleDashboardHref("admin")).toBe("/admin");
  });

  it("returns role badge metadata by role", () => {
    expect(getRoleBadgeVariant("author").label).toBe("Author");
    expect(getRoleBadgeVariant("staff").label).toBe("Staff");
    expect(getRoleBadgeVariant("admin").label).toBe("Admin");
    expect(getRoleBadgeVariant("guest").label).toBe("Guest");
  });

  it("builds header nav model for guest and authenticated roles", () => {
    expect(
      getHeaderNavModel("guest").desktopItems.map((item) => item.label),
    ).toEqual(["Blog", "Store", "Subscription (VIP)", "Wiki", "Leaderboard"]);
    expect(getHeaderNavModel("guest").createActions).toEqual([]);

    expect(
      getHeaderNavModel("author").desktopItems.map((item) => item.label),
    ).toEqual(["Blog", "Store", "Dashboard", "Tickets", "Subscription", "Wallet"]);
    expect(
      getHeaderNavModel("author").createActions.map((item) => item.label),
    ).toEqual(["Write New Post", "Create Support Ticket"]);

    expect(
      getHeaderNavModel("staff").createActions.map((item) => item.label),
    ).toEqual([
      "Write New Post",
      "Create Support Ticket",
      "Add Product",
      "Publish Custom Order Product",
    ]);
  });
});
