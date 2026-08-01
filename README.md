# agc-codex

Card data uses JSON validated by JSON Schema + Ajv. Generation is mocked (no external APIs). Logs are JSONL.

## Commands

```sh
npm install
npm run build
npm test
npm run format
npm run generate -- --seed=demo --log=logs/generation.jsonl
```

## Structure

- `src/schema/card.schema.json` — card JSON Schema
- `src/generator` — generator interface + mock generator
- `src/logging/jsonl.ts` — JSONL log writer
- `tests/golden` — golden card cases
