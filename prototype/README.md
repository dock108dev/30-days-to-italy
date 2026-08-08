# Supporting Human-Run Prototype Packet

## Status

This is the complete disposable facilitation packet that preceded the web build. It remains useful as design rationale, manual QA material, and an observation template, but it is no longer the primary prototype. The playable experience is in [`../web/`](../web/).

This packet itself contains no application code, database, framework, provider integration, speech recognition, or microphone use. If used, a facilitator controls fixed NPC audio and authoritative state while the player listens and types.

## What this session tests

- Can the player act on Italian audio before reading it?
- Do terse and mixed-language responses work naturally?
- Can consequential ambiguity be clarified without arbitrary rejection?
- Do state and money remain coherent through a repair?
- Can the player decline optional familiarity without penalty?
- Are meaning-changing corrections useful and brief?

It does not test pronunciation, free conversation, content scale, polished voice production, or software usability.

## Packet

### Player receives

1. [`PLAYER_BRIEF.md`](PLAYER_BRIEF.md)
2. The practical objective for the current encounter
3. NPC audio selected and played by the facilitator
4. Consequences and, when warranted, one brief correction

The player should not read the encounter cards, state sheet, or observation sheet before the run.

### Facilitator uses

1. [`FACILITATOR_RUNBOOK.md`](FACILITATOR_RUNBOOK.md)
2. [`ENCOUNTER_CARDS.md`](ENCOUNTER_CARDS.md)
3. [`STATE_SHEET.md`](STATE_SHEET.md)
4. [`OBSERVATION_SHEET.md`](OBSERVATION_SHEET.md)
5. [`audio/INDEX.md`](audio/INDEX.md)
6. [`VALIDATION.md`](VALIDATION.md) — offline checks, dry-run paths, and the exact boundary of what still requires the learner session.

If Codex facilitates the session, it should first copy the two templates into `prototype/completed_runs/` with a date/time identifier and update only those copies during the run.

## Session length

| Segment | Target |
|---|---:|
| Orientation | 2 minutes |
| Day 0 hotel arrival | 7 minutes |
| Beach rental | 8 minutes |
| Café correction | 10 minutes |
| Familiar bartender | 8 minutes |
| Debrief | 5 minutes |
| **Total** | **40 minutes** |

The facilitator ends a resolved encounter rather than consuming its whole time allowance. Optional conversation occurs only if the player chooses it.

## Starting the session

The player can say:

> Start the Phase 2 prototype. Facilitate it from the packet, play the NPC audio, and keep my world state and observation record. Do not show me the encounter cards.

The session may be paused after any committed outcome. On resume, the facilitator reads the completed run’s state sheet rather than reconstructing events from memory.

## Completion standard

A run is complete when:

- all four encounters have a terminal practical outcome;
- exact money, inventory, keys, and commitments reconcile;
- support use and listening evidence are recorded separately from practical success;
- the player had a real terse/exit path in every encounter;
- the bartender’s optional question did not gate payment or departure;
- no facilitator-created fact or remedy entered canonical state;
- meaning-changing feedback appeared automatically and naturalness-only feedback stayed optional; and
- the debrief produces a Phase 3 recommendation: proceed, revise and rerun, or stop.

## Current limitations

- Fixed system-generated NPC audio is intentionally disposable.
- The later bartender scene begins from an explicitly synthetic history.
- A human facilitator interprets responses; this does not validate a model provider.
- The four scenes are compressed prototypes, not final ten-minute episode scripts.
- No evidence from this run should be presented as general language proficiency.
