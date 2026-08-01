# Absurd TCG

Monorepo for a rules engine, card schema, generator pipeline, and CLI.

## Quick start

```sh
pnpm install
pnpm build
pnpm test
pnpm generate -- --count=2 --seed=demo --out=logs/generation.jsonl
```

## Web (local)

```sh
pnpm --filter @absurd/web dev
```

## Workspace layout

- `packages/card-schema` — JSON Schema + types + Ajv validator
- `packages/engine` — rules engine, effect resolution, tests
- `packages/generator` — prompt -> json -> validate -> score -> accept/reject -> log
- `apps/cli` — CLI commands: generate, validate, run-sim
