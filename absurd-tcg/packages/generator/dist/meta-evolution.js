import { promises as fs } from "node:fs";
import { resolve } from "node:path";
export class MetaEvolutionPolicy {
    dataPath;
    requiredSimulations;
    constructor(dataPath = "data/pools/card-status.json", requiredSimulations = 10) {
        this.dataPath = dataPath;
        this.requiredSimulations = requiredSimulations;
    }
    async load() {
        const path = resolve(this.dataPath);
        try {
            const raw = await fs.readFile(path, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return { version: 1, cards: {} };
        }
    }
    async save(state) {
        const path = resolve(this.dataPath);
        await fs.writeFile(path, JSON.stringify(state, null, 2), "utf8");
    }
    async proposeCard(card) {
        const state = await this.load();
        const existing = state.cards[card.id];
        if (existing)
            return existing;
        const entry = {
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
    async approveCard(cardId) {
        const state = await this.load();
        const entry = state.cards[cardId];
        if (!entry)
            return null;
        entry.approved = true;
        entry.status = entry.banned ? "banned" : "approved";
        await this.save(state);
        return entry;
    }
    async banCard(cardId) {
        const state = await this.load();
        const entry = state.cards[cardId];
        if (!entry)
            return null;
        entry.banned = true;
        entry.status = "banned";
        await this.save(state);
        return entry;
    }
    async recordSimulationSuccess(cardId) {
        const state = await this.load();
        const entry = state.cards[cardId];
        if (!entry)
            return null;
        entry.simulationSuccesses += 1;
        await this.save(state);
        return entry;
    }
    async getCardPool(mode) {
        const state = await this.load();
        const entries = Object.values(state.cards).filter((entry) => !entry.banned);
        switch (mode) {
            case "Draft-Only":
                return entries.filter((entry) => entry.accepted);
            case "Curated Ladder":
                return entries.filter((entry) => entry.accepted &&
                    entry.approved &&
                    entry.simulationSuccesses >= this.requiredSimulations);
            case "Rogue Sandbox":
                return entries.filter((entry) => entry.accepted);
        }
    }
}
