import { type Card } from "@absurd/card-schema";
export { MetaEvolutionPolicy } from "./meta-evolution.js";
export interface ILlmClient {
    generate(prompt: string, seed: string): Promise<string>;
}
export declare class MockLlmClient implements ILlmClient {
    generate(prompt: string, seed: string): Promise<string>;
}
export declare class PromptBuilder {
    private loreBible;
    private rules;
    private schemaNotes;
    constructor(loreBible: string, rules: string, schemaNotes: string);
    build(seed: string): string;
}
export declare class CardValidator {
    validate(raw: string): {
        card?: Card;
        errors?: string[];
    };
}
export declare class BalanceScorer {
    score(card: Card): number;
}
export declare class AcceptancePolicy {
    accept(card: Card, powerScore: number): {
        accepted: boolean;
        reason?: string;
    };
}
export type GenerationLogEntry = {
    seed: string;
    promptHash: string;
    rawOutput: string;
    validationErrors?: string[];
    powerScore?: number;
    accepted: boolean;
    card?: Card;
};
export declare class Logger {
    write(path: string, entry: GenerationLogEntry): Promise<void>;
}
export type PipelineResult = GenerationLogEntry;
export declare const runPipeline: (llm: ILlmClient, promptBuilder: PromptBuilder, validator: CardValidator, scorer: BalanceScorer, policy: AcceptancePolicy, seed: string) => Promise<PipelineResult>;
