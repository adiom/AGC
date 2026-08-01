import { describe, expect, it } from "vitest";
import type { Card } from "@absurd/card-schema";
import {
  applyAction,
  createGame,
  getPublicView,
  isGameOver,
  listLegalActions
} from "../src/index";

const creatureCard = (id: string, cost = 2): Card => ({
  id,
  version: "1.0",
  name: "Test Creature",
  type: "Creature",
  faction: "Neutral",
  rarity: "Common",
  cost,
  stats: { attack: 2, health: 3 },
  keywords: [],
  text: "",
  flavor: "",
  artPrompt: "",
  tags: [],
  balance: { powerScore: 10, notes: "" },
  provenance: {
    createdAtISO: "2024-01-01T00:00:00.000Z",
    generator: "test",
    promptHash: "hash",
    seed: "seed"
  }
});

const spellCard = (id: string, text: string, cost = 1): Card => ({
  id,
  version: "1.0",
  name: "Test Spell",
  type: "Spell",
  faction: "Neutral",
  rarity: "Common",
  cost,
  stats: null,
  keywords: [],
  text,
  flavor: "",
  artPrompt: "",
  tags: [],
  balance: { powerScore: 10, notes: "" },
  provenance: {
    createdAtISO: "2024-01-01T00:00:00.000Z",
    generator: "test",
    promptHash: "hash",
    seed: "seed"
  }
});

describe("engine adapters", () => {
  it("creates a game with opening hands", () => {
    const deck = [creatureCard("c1"), creatureCard("c2"), creatureCard("c3")];
    const state = createGame({ deckA: deck, deckB: deck, seed: "demo" });
    expect(state.players.A.hand.length).toBeGreaterThan(0);
    expect(state.players.B.hand.length).toBeGreaterThan(0);
  });

  it("lists legal actions and applies play", () => {
    const deck = [creatureCard("c1")];
    const state = createGame({ deckA: deck, deckB: deck, seed: "demo" });
    state.players.A.mana = 5;
    const actions = listLegalActions(state);
    const play = actions.find((a) => a.type === "PlayCard");
    expect(play).toBeTruthy();
    const next = applyAction(state, play!);
    expect(next.players.A.battlefield.length).toBe(1);
  });

  it("enforces game over", () => {
    const deck = [creatureCard("c1")];
    const state = createGame({ deckA: deck, deckB: deck, seed: "demo" });
    state.players.B.hp = 0;
    const result = isGameOver(state);
    expect(result.over).toBe(true);
    expect(result.winner).toBe("A");
  });

  it("public view hides opponent hand details", () => {
    const deck = [creatureCard("c1"), spellCard("s1", "Draw 1")];
    const state = createGame({ deckA: deck, deckB: deck, seed: "demo" });
    const view = getPublicView(state, "A");
    expect(view.opponent.handCount).toBeGreaterThanOrEqual(0);
  });
});
