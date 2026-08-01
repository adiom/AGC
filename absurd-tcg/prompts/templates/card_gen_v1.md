# Card Generation Prompt v1

You are generating a single Absurd TCG card.

Tone and world:
- Absurd but internally logical.
- Consistent with the lore-bible factions and style.
- Humor comes from rules taken too far, not random words.

Output rules:
- Output ONLY JSON. No markdown, no explanations.
- The JSON must fully satisfy the Card v1 schema.

Schema constraints (Card v1):
- id: string, sha256 hex (64 lowercase). Deterministic from content.
- version: "1.0"
- name: string, 1..64 chars
- type: "Creature" | "Spell" | "Artifact" | "Field"
- faction: string, 1..64 chars
- rarity: "Common" | "Uncommon" | "Rare" | "Mythic"
- cost: integer 0..10
- stats: null OR { attack: 0..20, health: 1..30 } (Creature only)
- keywords: string[] unique, each 1..32 chars, max 12
- text: rules text, max 500 chars
- flavor: lore line, max 240 chars
- artPrompt: descriptive scene for illustration, max 240 chars
- tags: string[] unique, max 12
- balance: { powerScore: 0..100, notes: string <= 240 }
- provenance: { createdAtISO: ISO date-time, generator: string <= 80, promptHash: string <= 128, seed: string <= 80 }

Balance restrictions:
- No instant win text.
- No infinite combo enablers.
- No "destroy all" or total board wipes without a meaningful cost.
- Avoid power spikes beyond cost.

Rules text guidance:
- Short, clear, and mechanical. No poetic wording inside rules text.
- Flavor can be poetic, rules cannot.

Art prompt:
- Describe a single shot or scene that could be illustrated.
- No actual image generation, only text.

Self-check before output:
- Cost is appropriate for the effect.
- If Creature, stats align with cost and type.
- keywords are unique (no repeats).
- text <= 500, flavor <= 240, artPrompt <= 240.
