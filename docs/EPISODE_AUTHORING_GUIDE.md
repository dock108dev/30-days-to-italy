# Episode authoring guide

The Season 01 runtime has one rule: episode-specific behavior belongs in an episode module, never in the generic game coordinator.

## Authorities

- `web/app/season/manifest.ts` owns the 31 stable slots (`day-00` through `day-30`) and their planning metadata.
- `web/app/season/types.ts` owns the typed `EpisodeDefinition`, observed-move, verified-fact, runtime, and review-result contracts.
- `web/app/season/episodes/day-NN.ts` owns one implemented episode's scene, turns, outcomes, response rules, mutations, evidence extraction, Admin seed, version, and review builder.
- `web/app/season/registry.ts` registers the current modules and derives the authoritative scenes, turns, outcomes, turn ownership, outcome ownership, and terminal-validation indexes.
- `web/app/game/engine.ts` coordinates any registered definition. It must not gain day-specific handlers, ID-prefix inference, positional progression, or a multi-day conditional.
- `web/app/game/persistence.ts` validates current state through the registry. Legacy scene positions are accepted only at this migration boundary and are discarded immediately.

## Revising season metadata

Season 01 contains exactly 31 supported sessions. Revise truthful metadata in `manifest.ts`: title, objective, place, characters, target language, listening challenge, support stage, prerequisites, content version, and authoring status. There is no planned-session runtime or placeholder fallback.

## Replacing or substantially revising an episode

1. Create `app/season/episodes/day-NN.ts`.
2. Spread the session metadata from `seasonEpisode("day-NN")` into an `EpisodeDefinition`.
3. Supply the complete scene, owned turns and outcomes, terminal-outcome mapping, bounded evaluator, observational evidence extractor, state mutations, canonical Admin seed, review builder, and any outcome-specific completion IDs.
4. Register the module once in `IMPLEMENTED_EPISODE_DEFINITIONS` in `registry.ts`.
5. Add the exact normal/careful audio assets named by the turn IDs and the required unit, persistence, browser, and offline tests. `npm run audio:generate` fills missing registry-owned assets; it never runs in the product.

No engine branch is allowed. A future episode should require its module, registry entry, content/audio, and tests—nothing else in the coordinator.

## IDs and ownership

- Episode IDs are stable `day-NN` identifiers and are the only runtime identity authority.
- Turn and outcome keys must be unique within the registered season. Prefer `dNN_...` for new turn IDs, but prefixes are labels, not ownership logic.
- The episode's `scene.firstTurn` must exist in its own turn catalog.
- Each pending outcome must name an owned terminal turn explicitly in `terminalOutcomeTurns`.
- Only Day 30 may declare `completionOutcomeIds`. Every other outcome resolves normally, and non-qualifying Day 30 outcomes also remain resolved rather than complete.

## Observed evidence

Target language describes authoring intent, not proof. `observeResponse` runs after the evaluator and records only moves demonstrated in an accepted response. A retry that does not advance or resolve records nothing.

Examples:

- a recognized name can record `identify`;
- an accepted key request can record `request`;
- repeating the door color/floor can record `location` and `confirm`;
- an explicit one-versus-two choice can record `quantity` and `quantityClarified`;
- accepting a stated quote can record `price`, `confirm`, and `priceConfirmed`;
- leaving before those actions must not invent them.

Verified facts are a small typed structure for explicit quantity and price confirmation, destination and preference, reported problems, selected alternatives, confirmed commitments and routes, accepted corrections, and validated refunds. Do not store raw conversation history in evidence. Episode results retain at most eight attempts, and handoff selection identifies the greatest attempt number rather than assuming array order.

Pocket Deck eligibility and practiced evidence are different. The manifest may map an episode to a reviewed card, but a handoff is offered only when the latest completed result contains actual observed moves. The adapter copies those moves and verified facts; it never copies targets or infers proof from a successful outcome.

## State and relationships

All state mutations must be declared inside the episode evaluator and remain atomic with the accepted transition. Character relationship state is limited to `neutral`, `efficient`, `warm`, or `strained`. Factual memories belong in `knownFacts`; never store “served the first espresso” as a relationship disposition.

Schema v6 owns controlled continuity for location, time, laundry, transport mode/status/owned fare, hot-water state, exact repair commitments, both parcel handoffs, beach entitlement/remedy, invitations without invented attendance, table preference, repair-credit eligibility, the Day 28 multi-leg plan, key custody, checkout obligations, departure, preference evidence, and the bounded season-completion record. Later episodes may reference only the normalized saved value. A callback must degrade to a neutral or no-history variant when its prerequisite fact is absent.

`adminSeed()` constructs the canonical world immediately before the episode. It must be deterministic and must not mutate the traveler’s departure date. The generic seeder preserves support, phrase practice, and bounded prior attempt history while resetting only transient conversation evidence.

## Audio and offline inventory

Each turn owns exact normal and careful audio paths. The aggregate `TURNS` catalog is derived from registered definitions; the offline builder derives required audio counts from that catalog and the Pocket Deck catalog. Never hardcode a second audio list or count to make a test pass.

## Required validation

Every implemented episode needs tests for its successful path, valid exits, ambiguity/fail-closed behavior, actual observed moves, verified facts, state mutations, pending terminal reload, resolved reload, restart seed, and Admin selection. Cross-cutting gates must also cover schema migration, wrong-episode turn/outcome rejection, balances, Pocket Deck idempotency, production build, offline reload, desktop, 390×844 portrait, 844×390 landscape, and a clean browser console.
