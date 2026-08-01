# Meta Evolution Policy

## Modes

1) Draft-Only
- New cards are available only in draft queues.
- Constructed formats are unchanged.
- Goal: collect play data without destabilizing ladder.

2) Curated Ladder
- New cards enter ladder only after:
  - N successful simulation runs.
  - A manual approve flag.
- Goal: protect ladder integrity while allowing gradual rollout.

3) Rogue Sandbox
- Players can enable any accepted card.
- Matchmaking is separate from curated queues.
- Goal: maximize experimentation without affecting ranked play.

## Status Lifecycle
- proposed -> accepted -> approved -> active
- banned overrides all modes.

## Data Storage
- JSON in /data/pools with per-card status and metadata.
