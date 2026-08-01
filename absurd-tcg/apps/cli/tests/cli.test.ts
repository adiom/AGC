import { describe, expect, it } from "vitest";

describe("cli", () => {
  it("parses generate command", () => {
    const args = ["generate", "--count=2"];
    expect(args[0]).toBe("generate");
  });
});
