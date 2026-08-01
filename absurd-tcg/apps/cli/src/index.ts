#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCard } from "@absurd/card-schema";
import { createGameState, simulateRandomGame } from "@absurd/engine";
import {
  AcceptancePolicy,
  BalanceScorer,
  CardValidator,
  Logger,
  MockLlmClient,
  PromptBuilder,
  runPipeline
} from "@absurd/generator";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const [command, ...args] = process.argv.slice(2);

const getArg = (name: string, fallback?: string): string | undefined => {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const runGenerate = async () => {
  const count = Number(getArg("count", "1"));
  const seedBase = getArg("seed", "seed") ?? "seed";
  const baseDir = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
  const out = resolve(
    baseDir,
    getArg("out", "data/generation-log.jsonl") ?? "data/generation-log.jsonl"
  );
  const lore = await readFile(resolve(baseDir, "lore-bible/canon.md"), "utf8");
  const style = await readFile(resolve(baseDir, "lore-bible/style.md"), "utf8");
  const rules = "Return only valid JSON matching Card v1.";
  const constraints =
    "Fields required: id, version, name, type, faction, rarity, cost, stats, keywords, text, flavor, artPrompt, tags, balance, provenance.";

  const llm = new MockLlmClient();
  const builder = new PromptBuilder(`${lore}\n\n${style}`, rules, constraints);
  const validator = new CardValidator();
  const scorer = new BalanceScorer();
  const policy = new AcceptancePolicy();
  const logger = new Logger();

  await mkdir(dirname(out), { recursive: true });
  for (let i = 0; i < count; i += 1) {
    const seed = `${seedBase}-${i}`;
    const result = await runPipeline(llm, builder, validator, scorer, policy, seed);
    await logger.write(out, result);
  }
  console.log(`Wrote ${count} entries to ${out}`);
};

const runValidate = async () => {
  const file = getArg("file");
  if (!file) {
    console.error("Missing --file=path/to/card.json");
    process.exit(1);
  }
  const raw = await readFile(file, "utf8");
  const card = JSON.parse(raw);
  const result = validateCard(card);
  if (!result.valid) {
    console.error(result.errors);
    process.exit(1);
  }
  console.log("Card is valid");
};

const runSim = async () => {
  const baseDir = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
  const deckPath = resolve(
    baseDir,
    getArg("deck", "data/decks/starter.json") ?? "data/decks/starter.json"
  );
  const raw = await readFile(deckPath, "utf8");
  const deck = JSON.parse(raw);
  if (!Array.isArray(deck)) {
    throw new Error("Deck must be an array of cards");
  }
  const playerA = {
    id: "A",
    hp: 20,
    mana: 5,
    deck: [...deck],
    hand: [],
    battlefield: [],
    graveyard: []
  };
  const playerB = {
    id: "B",
    hp: 20,
    mana: 5,
    deck: [...deck],
    hand: [],
    battlefield: [],
    graveyard: []
  };
  const state = createGameState(playerA, playerB);
  const result = simulateRandomGame(state, 50);
  console.log(JSON.stringify(result, null, 2));
};

const runHelp = () => {
  console.log(`Absurd TCG CLI v${pkg.version}`);
  console.log("Commands: generate, validate, run-sim");
};

switch (command) {
  case "generate":
    await runGenerate();
    break;
  case "validate":
    await runValidate();
    break;
  case "run-sim":
    await runSim();
    break;
  default:
    runHelp();
    break;
}
