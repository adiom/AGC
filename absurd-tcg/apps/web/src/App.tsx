import { useEffect, useMemo, useState } from "react";
import {
  applyAction,
  createGame,
  getPublicView,
  isGameOver,
  listLegalActions,
  type GameAction,
  type GameState,
  type ActionTarget
} from "@absurd/engine";

type Card = {
  id: string;
  name: string;
  type: string;
  cost: number;
  text: string;
  stats?: { attack: number; health: number } | null;
  keywords?: string[];
};

type PendingTarget = {
  actionType: "PlayCard" | "Attack";
  options: GameAction[];
};

const maxLog = 30;

const formatTarget = (target?: ActionTarget): string => {
  if (!target) return "";
  if (target.type === "player") return `player ${target.playerId}`;
  return `creature ${target.ownerId}:${target.creatureIndex}`;
};

const actionLabel = (action: GameAction): string => {
  if (action.type === "EndTurn") return "End Turn";
  if (action.type === "PlayCard") return `Play card ${action.handIndex + 1}`;
  return `Attack with ${action.attackerIndex + 1} -> ${formatTarget(action.target)}`;
};

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingTarget | null>(null);

  useEffect(() => {
    fetch("/decks/starter.json")
      .then((res) => res.json())
      .then((data) => setDeck(data))
      .catch(() => setDeck([]));
  }, []);

  const view = useMemo(() => {
    if (!state) return null;
    return getPublicView(state, "A");
  }, [state]);

  const legalActions = useMemo(() => (state ? listLegalActions(state) : []), [state]);

  const appendLog = (entry: string) => {
    setLog((prev) => [...prev, entry].slice(-maxLog));
  };

  const startGame = () => {
    if (deck.length === 0) return;
    const game = createGame({ deckA: deck, deckB: deck, seed: "web" });
    setState(game);
    setLog(["New game started."]);
    setPending(null);
  };

  const apply = (action: GameAction) => {
    if (!state) return;
    const next = applyAction(state, action);
    setState(next);
    appendLog(actionLabel(action));
  };

  const handleEndTurn = () => {
    apply({ type: "EndTurn" });
  };

  const handlePlay = (handIndex: number) => {
    const options = legalActions.filter(
      (action) => action.type === "PlayCard" && action.handIndex === handIndex
    );
    if (options.length === 0) return;
    const needsTarget = options.some((opt) => opt.type === "PlayCard" && opt.target);
    if (!needsTarget) {
      apply(options[0]);
      return;
    }
    setPending({ actionType: "PlayCard", options });
  };

  const handleAttack = (attackerIndex: number) => {
    const options = legalActions.filter(
      (action) => action.type === "Attack" && action.attackerIndex === attackerIndex
    );
    if (options.length === 0) return;
    setPending({ actionType: "Attack", options });
  };

  const handleSelectTarget = (action: GameAction) => {
    apply(action);
    setPending(null);
  };

  const stepBot = () => {
    if (!state || state.activePlayerId !== "B") return;
    let next = state;
    let steps = 0;
    while (steps < 20) {
      const actions = listLegalActions(next);
      const playable = actions.find((action) => action.type === "PlayCard");
      if (playable) {
        next = applyAction(next, playable);
        appendLog(`Bot: ${actionLabel(playable)}`);
        steps += 1;
        continue;
      }
      const attacks = actions.filter((action) => action.type === "Attack");
      if (attacks.length > 0) {
        for (const attackAction of attacks) {
          next = applyAction(next, attackAction);
          appendLog(`Bot: ${actionLabel(attackAction)}`);
          steps += 1;
          if (steps >= 20) break;
        }
      }
      const end = actions.find((action) => action.type === "EndTurn");
      if (end) {
        next = applyAction(next, end);
        appendLog("Bot: End Turn");
      }
      break;
    }
    setState(next);
  };

  const status = state ? isGameOver(state) : { over: false };

  return (
    <div className="app">
      <header className="header">
        <h1>Absurd TCG</h1>
        <div className="controls">
          <button onClick={startGame} disabled={deck.length === 0}>
            Start New Game
          </button>
          <button onClick={handleEndTurn} disabled={!state || state.activePlayerId !== "A"}>
            End Turn
          </button>
          <button onClick={stepBot} disabled={!state || state.activePlayerId !== "B"}>
            Bot Step
          </button>
        </div>
      </header>

      {!state && <p className="hint">Load starter deck and start a game.</p>}

      {state && view && (
        <div className="board">
          <section className="player-zone">
            <div className="player-stats">
              <span>B HP: {view.opponent.hp}</span>
              <span>Mana: {view.opponent.mana}</span>
              <span>Hand: {view.opponent.handCount}</span>
            </div>
            <div className="battlefield">
              {view.opponent.battlefield.map((perm, index) => (
                <div className="card" key={`${perm.id}-${index}`}>
                  <div className="card-title">
                    {perm.card.name} ({perm.card.cost})
                  </div>
                  {perm.stats && (
                    <div className="card-stats">
                      {perm.stats.attack}/{perm.stats.health}
                    </div>
                  )}
                  <div className="card-text">{perm.card.text}</div>
                  {perm.card.keywords && perm.card.keywords.length > 0 && (
                    <div className="card-keywords">{perm.card.keywords.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="log">
            <h2>Log</h2>
            <div className="log-entries">
              {log.slice().reverse().map((entry, index) => (
                <div key={`${entry}-${index}`} className="log-entry">
                  {entry}
                </div>
              ))}
            </div>
            {status.over && (
              <div className="game-over">Game Over {status.winner ? `- ${status.winner}` : ""}</div>
            )}
          </section>

          <section className="player-zone">
            <div className="player-stats">
              <span>A HP: {view.you.hp}</span>
              <span>Mana: {view.you.mana}</span>
              <span>Hand: {view.you.handCount}</span>
            </div>
            <div className="battlefield">
              {view.you.battlefield.map((perm, index) => (
                <div className="card" key={`${perm.id}-${index}`}>
                  <div className="card-title">
                    {perm.card.name} ({perm.card.cost})
                  </div>
                  {perm.stats && (
                    <div className="card-stats">
                      {perm.stats.attack}/{perm.stats.health}
                    </div>
                  )}
                  <div className="card-text">{perm.card.text}</div>
                  {perm.card.keywords && perm.card.keywords.length > 0 && (
                    <div className="card-keywords">{perm.card.keywords.join(", ")}</div>
                  )}
                  {state.activePlayerId === "A" && perm.stats && !perm.summoningSickness && (
                    <button className="card-action" onClick={() => handleAttack(index)}>
                      Attack
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="hand">
              {state.players.A.hand.map((card, index) => (
                <div className="card" key={`${card.id}-${index}`}>
                  <div className="card-title">
                    {(card as Card).name} ({(card as Card).cost})
                  </div>
                  {(card as Card).stats && (
                    <div className="card-stats">
                      {(card as Card).stats?.attack}/{(card as Card).stats?.health}
                    </div>
                  )}
                  <div className="card-text">{(card as Card).text}</div>
                  {(card as Card).keywords && (card as Card).keywords!.length > 0 && (
                    <div className="card-keywords">{(card as Card).keywords!.join(", ")}</div>
                  )}
                  <button className="card-action" onClick={() => handlePlay(index)}>
                    Play
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {pending && (
        <div className="modal">
          <div className="modal-content">
            <h3>Select Target</h3>
            <div className="modal-actions">
              {pending.options.map((action, index) => (
                <button key={index} onClick={() => handleSelectTarget(action)}>
                  {actionLabel(action)}
                </button>
              ))}
            </div>
            <button className="secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
