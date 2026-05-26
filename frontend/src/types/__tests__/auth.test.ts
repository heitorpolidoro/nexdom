import { describe, it, expect } from "vitest";
import { UserRole } from "../auth";

describe("UserRole", () => {
  it("includes MANAGER", () => {
    expect(UserRole.MANAGER).toBe("MANAGER");
  });

  it("has exactly three roles", () => {
    expect(Object.keys(UserRole)).toHaveLength(3);
  });
});
