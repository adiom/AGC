import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { validateCard } from "../src/validation";
const goldenFiles = [
    "tests/golden/card-1.json",
    "tests/golden/card-2.json",
    "tests/golden/card-3.json",
    "tests/golden/card-4.json",
    "tests/golden/card-5.json"
];
describe("card validation", () => {
    it("accepts golden cards", async () => {
        for (const file of goldenFiles) {
            const raw = await readFile(file, "utf8");
            const card = JSON.parse(raw);
            const result = validateCard(card);
            expect(result.valid).toBe(true);
        }
    });
    it("rejects invalid cards", () => {
        const result = validateCard({ name: "No ID" });
        expect(result.valid).toBe(false);
    });
});
