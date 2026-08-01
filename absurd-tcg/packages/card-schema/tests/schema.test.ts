import { describe, expect, it } from "vitest";
import { assertValidCard, computeCardId, validateCard } from "../src/index";

describe("card schema", () => {
  it("accepts valid card", () => {
    const card = {
      id: "e2b9dc227a1a4f77e0bcbf5e5d5aa8e61a59a48b4f4d1e282f7ef50f36cb18f1",
      version: "1.0",
      name: "Cinderling",
      type: "Creature",
      faction: "Ember Court",
      rarity: "Common",
      cost: 2,
      stats: { attack: 2, health: 3 },
      keywords: ["Blaze"],
      text: "When this enters play, it deals 1 damage.",
      flavor: "A spark with a name.",
      artPrompt: "A tiny ember creature skittering across basalt.",
      tags: ["ember", "starter"],
      balance: { powerScore: 42, notes: "Baseline creature." },
      provenance: {
        createdAtISO: "2024-01-01T00:00:00.000Z",
        generator: "mock",
        promptHash: "prompt123",
        seed: "seed-1"
      }
    };
    expect(validateCard(card).valid).toBe(true);
    expect(assertValidCard(card).id).toBe(card.id);
  });

  it("rejects invalid card", () => {
    const card = {
      id: "bad",
      version: "1.0",
      name: "",
      type: "Spell",
      faction: "Void",
      rarity: "Common",
      cost: 12,
      stats: { attack: 2, health: 3 },
      keywords: [],
      text: "x",
      flavor: "y",
      artPrompt: "z",
      tags: [],
      balance: { powerScore: 20, notes: "n/a" },
      provenance: {
        createdAtISO: "2024-01-01T00:00:00.000Z",
        generator: "mock",
        promptHash: "prompt123",
        seed: "seed-1"
      }
    };
    expect(validateCard(card).valid).toBe(false);
  });

  it("computes stable id", () => {
    const draft = {
      version: "1.0",
      name: "Rift Walker",
      type: "Spell",
      faction: "Rift",
      rarity: "Rare",
      cost: 4,
      stats: null,
      keywords: ["Blink", "Traverse"],
      text: "Move a creature to any empty tile.",
      flavor: "Every step is elsewhere.",
      artPrompt: "A cloaked figure stepping through a fractured portal.",
      tags: ["rift", "mobility"],
      balance: { powerScore: 55, notes: "Mobility utility." },
      provenance: {
        generator: "mock",
        promptHash: "prompt456",
        seed: "seed-2",
        createdAtISO: "2024-02-01T00:00:00.000Z"
      }
    };
    const id1 = computeCardId(draft);
    const id2 = computeCardId({
      ...draft,
      provenance: { ...draft.provenance, createdAtISO: "2025-01-01T00:00:00.000Z" }
    });
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{64}$/);
  });
});
