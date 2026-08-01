import { promises as fs } from "node:fs";
import type { GenerationLogEntry } from "../types";

export const appendGenerationLog = async (
  filePath: string,
  entry: GenerationLogEntry
): Promise<void> => {
  const line = `${JSON.stringify(entry)}\n`;
  await fs.appendFile(filePath, line, "utf8");
};
