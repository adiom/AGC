import type { Card } from "@absurd/card-schema";
export type Phase = "start" | "draw" | "main" | "combat" | "end";
export type PlayerState = {
    id: string;
    hp: number;
    mana: number;
    deck: Card[];
    hand: Card[];
    battlefield: Permanent[];
    graveyard: Card[];
};
export type Permanent = {
    id: string;
    card: Card;
    ownerId: string;
    summoningSickness: boolean;
    stats: {
        attack: number;
        health: number;
    } | null;
};
export type GameState = {
    turn: number;
    activePlayerId: string;
    phase: Phase;
    players: Record<string, PlayerState>;
};
export type ActionTarget = {
    type: "player";
    playerId: string;
} | {
    type: "creature";
    ownerId: string;
    creatureIndex: number;
};
export type GameAction = {
    type: "EndTurn";
} | {
    type: "PlayCard";
    handIndex: number;
    target?: ActionTarget;
} | {
    type: "Attack";
    attackerIndex: number;
    target: ActionTarget;
};
export type PublicPlayerView = {
    id: string;
    hp: number;
    mana: number;
    handCount: number;
    battlefield: Permanent[];
    graveyardCount: number;
};
export type PublicGameView = {
    turn: number;
    activePlayerId: string;
    phase: Phase;
    you: PublicPlayerView;
    opponent: PublicPlayerView;
};
export type EffectAction = {
    kind: "damage-creature";
    amount: number;
    targetId: string;
} | {
    kind: "damage-player";
    amount: number;
    playerId: string;
} | {
    kind: "heal-player";
    amount: number;
    playerId: string;
} | {
    kind: "draw";
    amount: number;
    playerId: string;
} | {
    kind: "gain-mana";
    amount: number;
    playerId: string;
} | {
    kind: "gain-max-mana";
    amount: number;
    playerId: string;
};
export type PlayResult = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
export declare const createGameState: (playerA: PlayerState, playerB: PlayerState) => GameState;
export declare const drawCard: (state: GameState, playerId: string) => PlayResult;
export declare const playCard: (state: GameState, playerId: string, cardId: string, target?: string) => PlayResult;
export declare const attack: (state: GameState, attackerId: string, defender: string) => PlayResult;
export declare const endTurn: (state: GameState) => GameState;
export declare const advancePhase: (state: GameState) => GameState;
export declare const simulateRandomGame: (state: GameState, turns?: number) => GameState;
export declare const createGame: ({ deckA, deckB, seed }: {
    deckA: Card[];
    deckB: Card[];
    seed?: string;
}) => GameState;
export declare const listLegalActions: (state: GameState) => GameAction[];
export declare const applyAction: (state: GameState, action: GameAction) => GameState;
export declare const isGameOver: (state: GameState) => {
    over: boolean;
    winner?: "A" | "B";
};
export declare const getPublicView: (state: GameState, forPlayerId: "A" | "B") => PublicGameView;
