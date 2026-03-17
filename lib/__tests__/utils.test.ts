import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges classes and resolves tailwind conflicts", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("p-2", "p-4", "text-sm")).toBe("p-4 text-sm");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("alpha", undefined, null, "beta")).toBe("alpha beta");
  });
});
