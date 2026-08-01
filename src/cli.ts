import { createMockGenerator } from "./generator/mock";
import { appendGenerationLog } from "./logging/jsonl";
import { assertValidCard } from "./validation";

const args = process.argv.slice(2);
const seedArg = args.find((arg) => arg.startsWith("--seed="));
const logArg = args.find((arg) => arg.startsWith("--log="));
const seed = seedArg ? seedArg.split("=")[1] : undefined;
const logPath = logArg ? logArg.split("=")[1] : "generation.log.jsonl";

const generator = createMockGenerator();
const card = generator.generate(seed);
const validated = assertValidCard(card);

const entry = {
  timestamp: new Date().toISOString(),
  generator: generator.name,
  seed,
  card: validated
};

await appendGenerationLog(logPath, entry);
console.log(JSON.stringify(validated, null, 2));
