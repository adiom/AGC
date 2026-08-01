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
  stats: { attack: number; health: number } | null;
};

export type GameState = {
  turn: number;
  activePlayerId: string;
  phase: Phase;
  players: Record<string, PlayerState>;
};

export type ActionTarget =
  | { type: "player"; playerId: string }
  | { type: "creature"; ownerId: string; creatureIndex: number };

export type GameAction =
  | { type: "EndTurn" }
  | { type: "PlayCard"; handIndex: number; target?: ActionTarget }
  | { type: "Attack"; attackerIndex: number; target: ActionTarget };

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

export type EffectAction =
  | { kind: "damage-creature"; amount: number; targetId: string }
  | { kind: "damage-player"; amount: number; playerId: string }
  | { kind: "heal-player"; amount: number; playerId: string }
  | { kind: "draw"; amount: number; playerId: string }
  | { kind: "gain-mana"; amount: number; playerId: string }
  | { kind: "gain-max-mana"; amount: number; playerId: string };

export type PlayResult = { ok: true } | { ok: false; reason: string };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getOpponentId = (state: GameState, playerId: string): string => {
  const ids = Object.keys(state.players);
  const opponent = ids.find((id) => id !== playerId);
  if (!opponent) throw new Error("Opponent not found");
  return opponent;
};

export const createGameState = (playerA: PlayerState, playerB: PlayerState): GameState => ({
  turn: 1,
  activePlayerId: playerA.id,
  phase: "start",
  players: {
    [playerA.id]: playerA,
    [playerB.id]: playerB
  }
});

export const drawCard = (state: GameState, playerId: string): PlayResult => {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: "player-not-found" };
  const top = player.deck.shift();
  if (!top) return { ok: false, reason: "deck-empty" };
  player.hand.push(top);
  return { ok: true };
};

const findCardInHand = (player: PlayerState, cardId: string) =>
  player.hand.findIndex((card) => card.id === cardId);

const removeFromHand = (player: PlayerState, cardId: string): Card | null => {
  const index = findCardInHand(player, cardId);
  if (index === -1) return null;
  const [card] = player.hand.splice(index, 1);
  return card;
};

const addPermanent = (player: PlayerState, card: Card): Permanent => {
  const permanent: Permanent = {
    id: card.id,
    card,
    ownerId: player.id,
    summoningSickness: card.type === "Creature",
    stats: card.type === "Creature" && card.stats ? { ...card.stats } : null
  };
  player.battlefield.push(permanent);
  return permanent;
};

const parseEffect = (text: string): EffectAction[] | null => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const patterns: Array<(line: string) => EffectAction[] | null> = [
    (line) => {
      const match = line.match(/^Deal (\d+) damage to target creature$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "damage-creature", amount, targetId: "target" }];
    },
    (line) => {
      const match = line.match(/^Deal (\d+) damage to target player$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "damage-player", amount, playerId: "target" }];
    },
    (line) => {
      const match = line.match(/^Deal (\d+) damage to all creatures$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "damage-creature", amount, targetId: "all" }];
    },
    (line) => {
      const match = line.match(/^Draw (\d+)$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "draw", amount, playerId: "self" }];
    },
    (line) => {
      const match = line.match(/^Gain (\d+) mana this turn$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "gain-mana", amount, playerId: "self" }];
    },
    (line) => {
      const match = line.match(/^Gain (\d+) max mana$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "gain-max-mana", amount, playerId: "self" }];
    },
    (line) => {
      const match = line.match(/^Heal (\d+) to target player$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      return [{ kind: "heal-player", amount, playerId: "target" }];
    },
    (line) => {
      const match = line.match(/^Summon a 1\/1 Creature token$/i);
      if (!match) return null;
      return [];
    },
    (line) => {
      const match = line.match(/^Destroy target creature$/i);
      if (!match) return null;
      return [{ kind: "damage-creature", amount: 999, targetId: "target" }];
    }
  ];

  for (const pattern of patterns) {
    const result = pattern(trimmed);
    if (result) return result;
  }
  return null;
};

const resolveEffects = (
  state: GameState,
  playerId: string,
  actions: EffectAction[],
  target?: string
): PlayResult => {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: "player-not-found" };
  for (const action of actions) {
    switch (action.kind) {
      case "damage-creature": {
        const targetId = action.targetId === "target" ? target : action.targetId;
        if (!targetId) return { ok: false, reason: "missing-target" };
        if (targetId === "all") {
          for (const unit of player.battlefield.concat(
            state.players[getOpponentId(state, playerId)].battlefield
          )) {
            if (!unit.stats) continue;
            unit.stats.health -= action.amount;
          }
        } else {
          const allPermanents = Object.values(state.players).flatMap(
            (p) => p.battlefield
          );
          const unit = allPermanents.find((perm) => perm.id === targetId);
          if (!unit || !unit.stats) return { ok: false, reason: "target-invalid" };
          unit.stats.health -= action.amount;
        }
        break;
      }
      case "damage-player": {
        const targetPlayerId = action.playerId === "target" ? target : action.playerId;
        if (!targetPlayerId) return { ok: false, reason: "missing-target" };
        const targetPlayer = state.players[targetPlayerId];
        if (!targetPlayer) return { ok: false, reason: "target-invalid" };
        targetPlayer.hp = clamp(targetPlayer.hp - action.amount, 0, 20);
        break;
      }
      case "heal-player": {
        const targetPlayerId = action.playerId === "target" ? target : action.playerId;
        if (!targetPlayerId) return { ok: false, reason: "missing-target" };
        const targetPlayer = state.players[targetPlayerId];
        if (!targetPlayer) return { ok: false, reason: "target-invalid" };
        targetPlayer.hp = clamp(targetPlayer.hp + action.amount, 0, 20);
        break;
      }
      case "draw": {
        const targetPlayerId = action.playerId === "self" ? playerId : action.playerId;
        for (let i = 0; i < action.amount; i += 1) {
          drawCard(state, targetPlayerId);
        }
        break;
      }
      case "gain-mana": {
        const targetPlayerId = action.playerId === "self" ? playerId : action.playerId;
        const targetPlayer = state.players[targetPlayerId];
        if (!targetPlayer) return { ok: false, reason: "target-invalid" };
        targetPlayer.mana = clamp(targetPlayer.mana + action.amount, 0, 10);
        break;
      }
      case "gain-max-mana": {
        const targetPlayerId = action.playerId === "self" ? playerId : action.playerId;
        const targetPlayer = state.players[targetPlayerId];
        if (!targetPlayer) return { ok: false, reason: "target-invalid" };
        targetPlayer.mana = clamp(targetPlayer.mana + action.amount, 0, 10);
        break;
      }
    }
  }
  sweepDead(state);
  return { ok: true };
};

const sweepDead = (state: GameState) => {
  for (const player of Object.values(state.players)) {
    const alive: Permanent[] = [];
    for (const perm of player.battlefield) {
      if (perm.stats && perm.stats.health <= 0) {
        player.graveyard.push(perm.card);
      } else {
        alive.push(perm);
      }
    }
    player.battlefield = alive;
  }
};

export const playCard = (
  state: GameState,
  playerId: string,
  cardId: string,
  target?: string
): PlayResult => {
  const player = state.players[playerId];
  if (!player) return { ok: false, reason: "player-not-found" };
  const card = removeFromHand(player, cardId);
  if (!card) return { ok: false, reason: "card-not-in-hand" };
  if (card.cost > player.mana) {
    player.hand.push(card);
    return { ok: false, reason: "insufficient-mana" };
  }
  player.mana -= card.cost;
  if (card.type === "Creature" || card.type === "Artifact" || card.type === "Field") {
    addPermanent(player, card);
    return { ok: true };
  }
  const actions = parseEffect(card.text);
  if (actions === null) {
    player.graveyard.push(card);
    return { ok: false, reason: "effect-not-supported" };
  }
  const result = resolveEffects(state, playerId, actions, target);
  player.graveyard.push(card);
  return result;
};

export const attack = (
  state: GameState,
  attackerId: string,
  defender: string
): PlayResult => {
  const attackerOwner = Object.values(state.players).find((player) =>
    player.battlefield.some((perm) => perm.id === attackerId)
  );
  if (!attackerOwner) return { ok: false, reason: "attacker-not-found" };
  const attacker = attackerOwner.battlefield.find((perm) => perm.id === attackerId);
  if (!attacker || !attacker.stats) return { ok: false, reason: "attacker-invalid" };
  if (attacker.summoningSickness) return { ok: false, reason: "summoning-sickness" };

  if (defender === "player") {
    const opponentId = getOpponentId(state, attackerOwner.id);
    const opponent = state.players[opponentId];
    opponent.hp = clamp(opponent.hp - attacker.stats.attack, 0, 20);
    return { ok: true };
  }

  const defenderOwner = Object.values(state.players).find((player) =>
    player.battlefield.some((perm) => perm.id === defender)
  );
  if (!defenderOwner) return { ok: false, reason: "defender-not-found" };
  const defending = defenderOwner.battlefield.find((perm) => perm.id === defender);
  if (!defending || !defending.stats) return { ok: false, reason: "defender-invalid" };

  defending.stats.health -= attacker.stats.attack;
  attacker.stats.health -= defending.stats.attack;
  sweepDead(state);
  return { ok: true };
};

export const endTurn = (state: GameState): GameState => {
  state.phase = "end";
  const current = state.players[state.activePlayerId];
  for (const perm of current.battlefield) {
    perm.summoningSickness = false;
  }
  const opponentId = getOpponentId(state, state.activePlayerId);
  state.activePlayerId = opponentId;
  state.turn += 1;
  state.phase = "start";
  return state;
};

export const advancePhase = (state: GameState): GameState => {
  const order: Phase[] = ["start", "draw", "main", "combat", "end"];
  const index = order.indexOf(state.phase);
  const next = order[(index + 1) % order.length];
  state.phase = next;
  if (next === "draw") {
    drawCard(state, state.activePlayerId);
  }
  if (next === "end") {
    endTurn(state);
  }
  return state;
};

export const simulateRandomGame = (state: GameState, turns = 50): GameState => {
  for (let t = 0; t < turns; t += 1) {
    const player = state.players[state.activePlayerId];
    state.phase = "draw";
    drawCard(state, player.id);
    state.phase = "main";
    if (player.hand.length > 0) {
      const card = player.hand[Math.floor(Math.random() * player.hand.length)];
      if (card) playCard(state, player.id, card.id);
    }
    state.phase = "combat";
    const attackers = player.battlefield.filter((perm) => perm.stats && !perm.summoningSickness);
    if (attackers.length > 0) {
      const attacker = attackers[Math.floor(Math.random() * attackers.length)];
      attack(state, attacker.id, "player");
    }
    endTurn(state);
  }
  return state;
};

const cloneGameState = (state: GameState): GameState => {
  if (typeof structuredClone === "function") {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as GameState;
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seed?: string) => {
  let state = seed ? hashSeed(seed) : Math.floor(Math.random() * 2147483647);
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const shuffle = <T>(items: T[], rng: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const isCreature = (card: Card) => card.type === "Creature" && card.stats;

const requiresTarget = (text: string): "creature" | "player" | "none" => {
  const lower = text.toLowerCase();
  if (lower.includes("target creature")) return "creature";
  if (lower.includes("target player")) return "player";
  return "none";
};

export const createGame = ({
  deckA,
  deckB,
  seed
}: {
  deckA: Card[];
  deckB: Card[];
  seed?: string;
}): GameState => {
  const rng = createRng(seed);
  const playerA: PlayerState = {
    id: "A",
    hp: 20,
    mana: 0,
    deck: shuffle(deckA, rng),
    hand: [],
    battlefield: [],
    graveyard: []
  };
  const playerB: PlayerState = {
    id: "B",
    hp: 20,
    mana: 0,
    deck: shuffle(deckB, rng),
    hand: [],
    battlefield: [],
    graveyard: []
  };
  const state = createGameState(playerA, playerB);
  for (let i = 0; i < 5; i += 1) {
    drawCard(state, "A");
    drawCard(state, "B");
  }
  return state;
};

export const listLegalActions = (state: GameState): GameAction[] => {
  const player = state.players[state.activePlayerId];
  if (!player) return [];
  const actions: GameAction[] = [{ type: "EndTurn" }];
  player.hand.forEach((card, handIndex) => {
    if (card.cost > player.mana) return;
    const targetType = requiresTarget(card.text);
    if (targetType === "none") {
      actions.push({ type: "PlayCard", handIndex });
      return;
    }
    if (targetType === "player") {
      Object.values(state.players).forEach((p) => {
        actions.push({
          type: "PlayCard",
          handIndex,
          target: { type: "player", playerId: p.id }
        });
      });
      return;
    }
    const allCreatures = Object.values(state.players).flatMap((p) =>
      p.battlefield
        .map((perm, index) => ({ perm, index, ownerId: p.id }))
        .filter(({ perm }) => Boolean(perm.stats))
    );
    allCreatures.forEach(({ index, ownerId }) => {
      actions.push({
        type: "PlayCard",
        handIndex,
        target: { type: "creature", ownerId, creatureIndex: index }
      });
    });
  });

  player.battlefield.forEach((perm, attackerIndex) => {
    if (!perm.stats || perm.summoningSickness) return;
    const opponentId = getOpponentId(state, player.id);
    actions.push({
      type: "Attack",
      attackerIndex,
      target: { type: "player", playerId: opponentId }
    });
    state.players[opponentId].battlefield.forEach((defender, creatureIndex) => {
      if (!defender.stats) return;
      actions.push({
        type: "Attack",
        attackerIndex,
        target: { type: "creature", ownerId: opponentId, creatureIndex }
      });
    });
  });

  return actions;
};

export const applyAction = (state: GameState, action: GameAction): GameState => {
  const next = cloneGameState(state);
  const player = next.players[next.activePlayerId];
  if (!player) return next;
  switch (action.type) {
    case "EndTurn":
      return endTurn(next);
    case "PlayCard": {
      const card = player.hand[action.handIndex];
      if (!card) return next;
      let targetId: string | undefined;
      if (action.target?.type === "creature") {
        const owner = next.players[action.target.ownerId];
        const perm = owner?.battlefield[action.target.creatureIndex];
        targetId = perm?.id;
      }
      if (action.target?.type === "player") {
        targetId = action.target.playerId;
      }
      playCard(next, player.id, card.id, targetId);
      return next;
    }
    case "Attack": {
      const attacker = player.battlefield[action.attackerIndex];
      if (!attacker) return next;
      if (action.target.type === "player") {
        attack(next, attacker.id, "player");
        return next;
      }
      const defenderOwner = next.players[action.target.ownerId];
      const defender = defenderOwner?.battlefield[action.target.creatureIndex];
      if (!defender) return next;
      attack(next, attacker.id, defender.id);
      return next;
    }
  }
};

export const isGameOver = (
  state: GameState
): { over: boolean; winner?: "A" | "B" } => {
  const playerA = state.players.A;
  const playerB = state.players.B;
  if (!playerA || !playerB) return { over: false };
  if (playerA.hp <= 0 && playerB.hp <= 0) return { over: true };
  if (playerA.hp <= 0) return { over: true, winner: "B" };
  if (playerB.hp <= 0) return { over: true, winner: "A" };
  return { over: false };
};

export const getPublicView = (state: GameState, forPlayerId: "A" | "B"): PublicGameView => {
  const you = state.players[forPlayerId];
  const opponentId = getOpponentId(state, forPlayerId);
  const opp = state.players[opponentId];
  return {
    turn: state.turn,
    activePlayerId: state.activePlayerId,
    phase: state.phase,
    you: {
      id: you.id,
      hp: you.hp,
      mana: you.mana,
      handCount: you.hand.length,
      battlefield: you.battlefield,
      graveyardCount: you.graveyard.length
    },
    opponent: {
      id: opp.id,
      hp: opp.hp,
      mana: opp.mana,
      handCount: opp.hand.length,
      battlefield: opp.battlefield,
      graveyardCount: opp.graveyard.length
    }
  };
};
