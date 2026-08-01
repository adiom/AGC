import { describe, expect, it } from "vitest";
import type { Card } from "@absurd/card-schema";
import {
  attack,
  createGameState,
  drawCard,
  endTurn,
  playCard,
  simulateRandomGame
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

const createPlayers = () => {
  const playerA = {
    id: "A",
    hp: 20,
    mana: 5,
    deck: [],
    hand: [],
    battlefield: [],
    graveyard: []
  };
  const playerB = {
    id: "B",
    hp: 20,
    mana: 5,
    deck: [],
    hand: [],
    battlefield: [],
    graveyard: []
  };
  return { playerA, playerB };
};

describe("engine", () => {
  it("playing a card reduces mana", () => {
    const { playerA, playerB } = createPlayers();
    const card = creatureCard("c-1", 3);
    playerA.hand.push(card);
    const state = createGameState(playerA, playerB);
    const result = playCard(state, "A", "c-1");
    expect(result.ok).toBe(true);
    expect(state.players.A.mana).toBe(2);
  });

  it("damage to creature and death moves to graveyard", () => {
    const { playerA, playerB } = createPlayers();
    const target = creatureCard("target", 1);
    playerB.battlefield.push({
      id: target.id,
      card: target,
      ownerId: "B",
      summoningSickness: false,
      stats: { attack: 2, health: 2 }
    });
    const spell = spellCard("spell", "Deal 3 damage to target creature", 1);
    playerA.hand.push(spell);
    const state = createGameState(playerA, playerB);
    const result = playCard(state, "A", "spell", "target");
    expect(result.ok).toBe(true);
    expect(state.players.B.battlefield).toHaveLength(0);
    expect(state.players.B.graveyard).toHaveLength(1);
  });

  it("damage to player reduces hp", () => {
    const { playerA, playerB } = createPlayers();
    const spell = spellCard("spell", "Deal 4 damage to target player", 1);
    playerA.hand.push(spell);
    const state = createGameState(playerA, playerB);
    const result = playCard(state, "A", "spell", "B");
    expect(result.ok).toBe(true);
    expect(state.players.B.hp).toBe(16);
  });

  it("summoning sickness prevents attack", () => {
    const { playerA, playerB } = createPlayers();
    const card = creatureCard("c-2", 2);
    playerA.hand.push(card);
    const state = createGameState(playerA, playerB);
    playCard(state, "A", "c-2");
    const attacker = state.players.A.battlefield[0];
    const result = attack(state, attacker.id, "player");
    expect(result.ok).toBe(false);
    endTurn(state);
    const resultAfter = attack(state, attacker.id, "player");
    expect(resultAfter.ok).toBe(true);
  });

  it("random simulation runs", () => {
    const { playerA, playerB } = createPlayers();
    playerA.deck.push(creatureCard("c-3"));
    playerB.deck.push(creatureCard("c-4"));
    const state = createGameState(playerA, playerB);
    drawCard(state, "A");
    drawCard(state, "B");
    const result = simulateRandomGame(state, 10);
    expect(result.turn).toBeGreaterThan(1);
  });
});
