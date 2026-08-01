import Ajv, { type ErrorObject } from "ajv";
import schema from "./schema/card.schema.json";
import type { Card } from "./types";

const ajv = new Ajv({ allErrors: true });
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
