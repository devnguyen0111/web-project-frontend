import { describe, expect, it } from "vitest";
import { resolveLegacyPathname } from "@/lib/routes";

describe("resolveLegacyPathname", () => {
  it("maps auth legacy routes", () => {
    expect(resolveLegacyPathname("/auth/login")).toBe("/login");
    expect(resolveLegacyPathname("/auth/register")).toBe("/register");
  });

  it("maps public legacy routes", () => {
    expect(resolveLegacyPathname("/main/blog")).toBe("/blog");
    expect(resolveLegacyPathname("/main/blog/hello-world")).toBe("/blog/hello-world");
    expect(resolveLegacyPathname("/main/subscription")).toBe("/subscription");
    expect(resolveLegacyPathname("/main/subscriptions")).toBe("/subscriptions");
  });

  it("maps dashboard legacy routes", () => {
    expect(resolveLegacyPathname("/dashboard/dashboard")).toBe("/dashboard");
    expect(resolveLegacyPathname("/dashboard/dashboard/posts/new")).toBe(
      "/dashboard/posts/new",
    );
    expect(resolveLegacyPathname("/dashboard/dashboard/posts/abc/edit")).toBe(
      "/dashboard/posts/abc/edit",
    );
    expect(resolveLegacyPathname("/dashboard/dashboard/subscription")).toBe(
      "/settings/subscription",
    );
    expect(resolveLegacyPathname("/dashboard/settings/subscription")).toBe(
      "/settings/subscription",
    );
    expect(resolveLegacyPathname("/dashboard/staff/taxonomy")).toBe("/staff/taxonomy");
    expect(resolveLegacyPathname("/dashboard/admin/users")).toBe("/admin/users");
  });

  it("returns null for canonical route", () => {
    expect(resolveLegacyPathname("/dashboard")).toBeNull();
    expect(resolveLegacyPathname("/subscription")).toBeNull();
  });
});
