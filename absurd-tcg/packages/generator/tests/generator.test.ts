import { describe, expect, it } from "vitest";
import {
  AcceptancePolicy,
  BalanceScorer,
  CardValidator,
  MockLlmClient,
  PromptBuilder,
  runPipeline
} from "../src/index";

describe("generator pipeline", () => {
  it("accepts valid card and returns log", async () => {
    const llm = new MockLlmClient();
    const builder = new PromptBuilder("Lore", "Rules", "Constraints");
    const validator = new CardValidator();
    const scorer = new BalanceScorer();
    const policy = new AcceptancePolicy();
    for (let i = 0; i < 20; i += 1) {
      const result = await runPipeline(
        llm,
        builder,
        validator,
        scorer,
        policy,
        `alpha-${i}`
      );
      if (result.accepted) {
        expect(result.card?.id).toMatch(/^[a-f0-9]{64}$/);
        return;
      }
    }
    throw new Error("No accepted card produced in 20 attempts.");
  });
});
