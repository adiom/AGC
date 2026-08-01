import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const require = createRequire(import.meta.url);
const schema = require("./schema/card.schema.json");
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
export const validateCard = (card) => {
    const valid = validate(card);
    return { valid: Boolean(valid), errors: validate.errors };
};
export const assertValidCard = (card) => {
    const result = validateCard(card);
    if (!result.valid) {
        const message = ajv.errorsText(result.errors, { separator: "; " });
        throw new Error(`Card validation failed: ${message}`);
    }
    return card;
};
export { schema as cardSchema };
const stableStringify = (value) => {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
    }
    return JSON.stringify(value);
};
export const computeCardId = (cardDraft) => {
    const { id: _id, ...rest } = cardDraft;
    const provenance = { ...rest.provenance };
    delete provenance.createdAtISO;
    const payload = { ...rest, provenance };
    const normalized = stableStringify(payload);
    return createHash("sha256").update(normalized).digest("hex");
};
