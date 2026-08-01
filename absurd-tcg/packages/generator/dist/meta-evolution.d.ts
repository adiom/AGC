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
export declare class MetaEvolutionPolicy {
    private dataPath;
    private requiredSimulations;
    constructor(dataPath?: string, requiredSimulations?: number);
    private load;
    private save;
    proposeCard(card: Card): Promise<CardStatusEntry>;
    approveCard(cardId: string): Promise<CardStatusEntry | null>;
    banCard(cardId: string): Promise<CardStatusEntry | null>;
    recordSimulationSuccess(cardId: string): Promise<CardStatusEntry | null>;
    getCardPool(mode: MetaMode): Promise<CardStatusEntry[]>;
}
