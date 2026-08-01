import { createHash } from "node:crypto";
import { assertValidCard, computeCardId, validateCard, type Card } from "@absurd/card-schema";
export { MetaEvolutionPolicy } from "./meta-evolution.js";

export interface ILlmClient {
  generate(prompt: string, seed: string): Promise<string>;
}

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRng = (seed: string) => {
  let state = hashSeed(seed);
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

export class MockLlmClient implements ILlmClient {
  async generate(prompt: string, seed: string): Promise<string> {
    const rng = seededRng(seed);
    const fail = hashSeed(seed) % 10 === 0;
    if (fail) {
      return "{\"bad\": \"output\"}";
    }
    const types: Card["type"][] = ["Creature", "Spell", "Artifact", "Field"];
    const factions = ["Ember Court", "Rift", "Iron Pact", "Verdant"];
    const rarities: Card["rarity"][] = ["Common", "Uncommon", "Rare", "Mythic"];
    const type = types[Math.floor(rng() * types.length)];
    const name = `Mock ${seed}`;
    const stats =
      type === "Creature"
        ? { attack: Math.floor(rng() * 6) + 1, health: Math.floor(rng() * 6) + 2 }
        : null;
    const draft = {
      version: "1.0" as const,
      name,
      type,
      faction: factions[Math.floor(rng() * factions.length)],
      rarity: rarities[Math.floor(rng() * rarities.length)],
      cost: Math.floor(rng() * 6),
      stats,
      keywords: ["Mock"],
      text: type === "Spell" ? "Deal 3 damage to target creature" : "A steady presence.",
      flavor: "Born of mock data.",
      artPrompt: "Stylized illustration of a surreal entity.",
      tags: ["mock", "absurd"],
      balance: { powerScore: 50, notes: "Auto-score" },
      provenance: {
        generator: "mock-llm",
        promptHash: createHash("sha256").update(prompt).digest("hex"),
        seed,
        createdAtISO: new Date().toISOString()
      }
    };
    const id = computeCardId(draft);
    const card = { ...draft, id };
    return JSON.stringify(card);
  }
}

export class PromptBuilder {
  constructor(
    private loreBible: string,
    private rules: string,
    private schemaNotes: string
  ) {}

  build(seed: string): string {
    return [
      "You are generating an Absurd TCG card in JSON.",
      `Seed: ${seed}`,
      "Lore Bible:",
      this.loreBible,
      "Rules:",
      this.rules,
      "Schema Constraints:",
      this.schemaNotes,
      "Return ONLY JSON."
    ].join("\n");
  }
}

export class CardValidator {
  validate(raw: string): { card?: Card; errors?: string[] } {
    try {
      const parsed = JSON.parse(raw);
      const result = validateCard(parsed);
      if (!result.valid) {
        return {
          errors: result.errors?.map((err) => err.message ?? "schema-error") ?? []
        };
      }
      return { card: assertValidCard(parsed) };
    } catch (error) {
      return { errors: [error instanceof Error ? error.message : "invalid-json"] };
    }
  }
}

const keywordWeights: Record<string, number> = {
  damage: 8,
  draw: 6,
  destroy: 12,
  heal: 5,
  mana: 4,
  summon: 10
};

export class BalanceScorer {
  score(card: Card): number {
    let score = 0;
    score += Math.max(0, 20 - card.cost * 2);
    if (card.stats) {
      score += card.stats.attack * 4 + card.stats.health * 2;
    }
    const text = card.text.toLowerCase();
    for (const [keyword, weight] of Object.entries(keywordWeights)) {
      if (text.includes(keyword)) score += weight;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

const forbiddenPatterns = [
  /instant win/i,
  /infinite combo/i,
  /destroy all/i
];

export class AcceptancePolicy {
  accept(card: Card, powerScore: number): { accepted: boolean; reason?: string } {
    if (powerScore > 80 || powerScore < 15) {
      return { accepted: false, reason: "powerScore-out-of-range" };
    }
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(card.text)) {
        return { accepted: false, reason: "forbidden-text" };
      }
    }
    return { accepted: true };
  }
}

export type GenerationLogEntry = {
  seed: string;
  promptHash: string;
  rawOutput: string;
  validationErrors?: string[];
  powerScore?: number;
  accepted: boolean;
  card?: Card;
};

export class Logger {
  async write(path: string, entry: GenerationLogEntry): Promise<void> {
    const { promises: fs } = await import("node:fs");
    await fs.appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
  }
}

export type PipelineResult = GenerationLogEntry;

export const runPipeline = async (
  llm: ILlmClient,
  promptBuilder: PromptBuilder,
  validator: CardValidator,
  scorer: BalanceScorer,
  policy: AcceptancePolicy,
  seed: string
): Promise<PipelineResult> => {
  const prompt = promptBuilder.build(seed);
  const promptHash = createHash("sha256").update(prompt).digest("hex");
  const rawOutput = await llm.generate(prompt, seed);
  const validation = validator.validate(rawOutput);
  if (!validation.card) {
    return {
      seed,
      promptHash,
      rawOutput,
      validationErrors: validation.errors ?? ["invalid-card"],
      accepted: false
    };
  }
  const powerScore = scorer.score(validation.card);
  const decision = policy.accept(validation.card, powerScore);
  return {
    seed,
    promptHash,
    rawOutput,
    validationErrors: validation.errors,
    powerScore,
    accepted: decision.accepted,
    card: decision.accepted ? validation.card : undefined
  };
};
