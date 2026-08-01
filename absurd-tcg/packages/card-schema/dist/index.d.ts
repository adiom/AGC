import { type ErrorObject } from "ajv/dist/2020.js";
declare const schema: any;
export type CardType = "Creature" | "Spell" | "Artifact" | "Field";
export type CardRarity = "Common" | "Uncommon" | "Rare" | "Mythic";
export type CardStats = {
    attack: number;
    health: number;
};
export type CardBalance = {
    powerScore: number;
    notes: string;
};
export type CardProvenance = {
    createdAtISO: string;
    generator: string;
    promptHash: string;
    seed: string;
};
export type Card = {
    id: string;
    version: "1.0";
    name: string;
    type: CardType;
    faction: string;
    rarity: CardRarity;
    cost: number;
    stats: CardStats | null;
    keywords: string[];
    text: string;
    flavor: string;
    artPrompt: string;
    tags: string[];
    balance: CardBalance;
    provenance: CardProvenance;
};
export type CardDraft = Omit<Card, "id" | "provenance"> & {
    provenance: Omit<CardProvenance, "createdAtISO"> & {
        createdAtISO?: string;
    };
    id?: string;
};
export type ValidationResult = {
    valid: boolean;
    errors: ErrorObject[] | null | undefined;
};
export declare const validateCard: (card: unknown) => ValidationResult;
export declare const assertValidCard: (card: unknown) => Card;
export { schema as cardSchema };
export declare const computeCardId: (cardDraft: CardDraft) => string;
