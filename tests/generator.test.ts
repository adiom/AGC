import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createMockGenerator } from "../src/generator/mock";
import { appendGenerationLog } from "../src/logging/jsonl";
import { validateCard } from "../src/validation";

const generator = createMockGenerator();

describe("mock generator", () => {
  it("produces valid cards", () => {
    const card = generator.generate("seed-1");
    const result = validateCard(card);
    expect(result.valid).toBe(true);
  });

  it("writes JSONL logs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agc-log-"));
    const logPath = join(dir, "generation.jsonl");
    const card = generator.generate("seed-2");

    await appendGenerationLog(logPath, {
      timestamp: new Date("2024-01-01T00:00:00.000Z").toISOString(),
      generator: generator.name,
      seed: "seed-2",
      card
    });

    const content = await readFile(logPath, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.generator).toBe("mock");
  });
});
