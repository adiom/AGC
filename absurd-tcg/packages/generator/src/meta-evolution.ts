import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Card } from "@absurd/card-schema";

export type MetaMode = "Draft-Only" | "Curated Ladder" | "Rogue Sandbox";
export type CardStatus = "proposed" | "accepted" | "approved" | "active" | "banned";

export type CardStatusEntry = {
  id: string;
  status: CardStatus;
  accepted: boolean;
  approved: boolean;
  banned: boolean;
  simulationSuccesses: number;
};

export type CardPoolState = {
  version: number;
  cards: Record<string, CardStatusEntry>;
};

export class MetaEvolutionPolicy {
  constructor(private dataPath = "data/pools/card-status.json", private requiredSimulations = 10) {}

  private async load(): Promise<CardPoolState> {
    const path = resolve(this.dataPath);
    try {
      const raw = await fs.readFile(path, "utf8");
      return JSON.parse(raw) as CardPoolState;
    } catch {
      return { version: 1, cards: {} };
    }
  }

  private async save(state: CardPoolState): Promise<void> {
    const path = resolve(this.dataPath);
    await fs.writeFile(path, JSON.stringify(state, null, 2), "utf8");
  }

  async proposeCard(card: Card): Promise<CardStatusEntry> {
    const state = await this.load();
    const existing = state.cards[card.id];
    if (existing) return existing;
    const entry: CardStatusEntry = {
      id: card.id,
      status: "proposed",
      accepted: true,
      approved: false,
      banned: false,
      simulationSuccesses: 0
    };
    state.cards[card.id] = entry;
    await this.save(state);
    return entry;
  }

  async approveCard(cardId: string): Promise<CardStatusEntry | null> {
    const state = await this.load();
    const entry = state.cards[cardId];
    if (!entry) return null;
    entry.approved = true;
    entry.status = entry.banned ? "banned" : "approved";
    await this.save(state);
    return entry;
  }

  async banCard(cardId: string): Promise<CardStatusEntry | null> {
    const state = await this.load();
    const entry = state.cards[cardId];
    if (!entry) return null;
    entry.banned = true;
    entry.status = "banned";
    await this.save(state);
    return entry;
  }

  async recordSimulationSuccess(cardId: string): Promise<CardStatusEntry | null> {
    const state = await this.load();
    const entry = state.cards[cardId];
    if (!entry) return null;
    entry.simulationSuccesses += 1;
    await this.save(state);
    return entry;
  }

  async getCardPool(mode: MetaMode): Promise<CardStatusEntry[]> {
    const state = await this.load();
    const entries = Object.values(state.cards).filter((entry) => !entry.banned);
    switch (mode) {
      case "Draft-Only":
        return entries.filter((entry) => entry.accepted);
      case "Curated Ladder":
        return entries.filter(
          (entry) =>
            entry.accepted &&
            entry.approved &&
            entry.simulationSuccesses >= this.requiredSimulations
        );
      case "Rogue Sandbox":
        return entries.filter((entry) => entry.accepted);
    }
  }
}
