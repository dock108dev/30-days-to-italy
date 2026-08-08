# 30 Days to Italy

**Your trip starts 30 days before departure.**

30 Days to Italy is a guided vacation-preparation experience for a 7–10 day Italian coastal trip. Before departure, the traveler rehearses likely situations through short audio-first simulations. During the trip, that preparation becomes a fast, personal, offline-friendly Pocket Deck.

> Rehearse your trip before you take it, then carry the most useful parts with you.

## Current state

The first interaction proof is implemented in [`web/`](web/). It includes a short device-local trip profile and departure countdown, four playable coastal encounters, normal/careful Italian audio, typed responses, bounded consequences, local save/resume, Admin controls, contextual teaching when the player falls back to English, and a 12-pattern phrase toolkit.

That prototype proves the encounter loop and departure setup. It does **not yet** prove the complete product lifecycle: Prepare/Trip modes, guided daily sessions, Pocket Deck creation, and offline card retrieval remain in the next slice.

The earlier **Un mese sulla costa** premise and content map are retained as reusable rehearsal material. The 30 sessions now prepare for a shorter real trip; they do not represent 30 literal vacation days.

## Start here

1. [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md) — the authoritative two-mode product direction.
2. [`docs/NEXT_SESSION_HANDOFF.md`](docs/NEXT_SESSION_HANDOFF.md) — the exact next implementation slice and definition of done.
3. [`docs/GUIDED_REHEARSAL_SPEC.md`](docs/GUIDED_REHEARSAL_SPEC.md) — how guided daily preparation, teaching, recurrence, and missed days work.
4. [`docs/TRIP_MODE_AND_POCKET_DECK.md`](docs/TRIP_MODE_AND_POCKET_DECK.md) — the trip-pack, card, offline, and mode-transition contract.
5. [`web/README.md`](web/README.md) — run and use the current web prototype.
6. [`docs/PRODUCT_CONTRACT.md`](docs/PRODUCT_CONTRACT.md) — encounter, agency, consequence, and lifecycle rules.
7. [`docs/LEARNING_MODEL.md`](docs/LEARNING_MODEL.md) — language activation, support, correction, and evaluation.
8. [`docs/SEASON_01_MAP.md`](docs/SEASON_01_MAP.md) — the legacy 30-day content library to be rescheduled as pre-departure rehearsal.
9. [`docs/CONTENT_AND_STATE_MODEL.md`](docs/CONTENT_AND_STATE_MODEL.md) — authored constraints, trip profile, rehearsal state, and Pocket Deck concepts.
10. [`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) — the two-mode architecture and technical boundaries.
11. [`docs/ROADMAP_AND_DECISIONS.md`](docs/ROADMAP_AND_DECISIONS.md) — confirmed decisions, risks, gates, and milestone status.

## Next milestone

Do not add more encounters yet. Prove the lifecycle with one guided rehearsal and one useful handoff:

1. use the completed trip profile and departure countdown;
2. add the Prepare/Trip lifecycle shell;
3. wrap the existing beach encounter as a guided preparation session;
4. turn its practice evidence into a personalized Pocket Deck card;
5. find, play, pin, and show the card in Trip Mode; and
6. verify the essential small deck remains usable locally/offline.

The milestone succeeds only if the Pocket Deck feels meaningfully more useful than an ordinary phrase list.

## Product boundaries

The first version remains private, web-first, typed, and microphone-free. It does not provide booking, itinerary management, current transportation facts, unrestricted live AI translation, or fluency claims. Simulated details are rehearsal content, never live travel information.
