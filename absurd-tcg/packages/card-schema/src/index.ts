import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const require = createRequire(import.meta.url);
const schema = require("./schema/card.schema.json");

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
  provenance: Omit<CardProvenance, "createdAtISO"> & { createdAtISO?: string };
  id?: string;
};

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile<Card>(schema);

export type ValidationResult = {
  valid: boolean;
  errors: ErrorObject[] | null | undefined;
};

export const validateCard = (card: unknown): ValidationResult => {
  const valid = validate(card);
  return { valid: Boolean(valid), errors: validate.errors };
};

export const assertValidCard = (card: unknown): Card => {
  const result = validateCard(card);
  if (!result.valid) {
    const message = ajv.errorsText(result.errors, { separator: "; " });
    throw new Error(`Card validation failed: ${message}`);
  }
  return card as Card;
};

export { schema as cardSchema };

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const computeCardId = (cardDraft: CardDraft): string => {
  const { id: _id, ...rest } = cardDraft;
  const provenance = { ...rest.provenance };
  delete provenance.createdAtISO;
  const payload = { ...rest, provenance };
  const normalized = stableStringify(payload);
  return createHash("sha256").update(normalized).digest("hex");
};
