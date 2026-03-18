import { describe, expect, it } from "vitest";
import {
  canAccessDashboard,
  canAccessModeration,
  getNavbarLinks,
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
    expect(getNavbarLinks("guest").map((item) => item.href)).toEqual(["/blog"]);
    expect(getNavbarLinks("author").map((item) => item.href)).toEqual([
      "/blog",
      "/dashboard",
    ]);
    expect(getNavbarLinks("staff").map((item) => item.href)).toEqual([
      "/blog",
      "/dashboard",
      "/staff",
    ]);
    expect(getNavbarLinks("admin").map((item) => item.href)).toEqual([
      "/blog",
      "/dashboard",
      "/admin",
    ]);
  });
});
