# Content and State Model

## Purpose and boundary

This document defines the concepts an authoring and runtime system must represent. It is intentionally not an executable schema, API contract, database design, or model prompt.

The central rule is:

> Authored content defines what can be true; language interpretation proposes what the player means; deterministic game rules decide what becomes true.

Flexible typed language is permitted inside a constrained encounter. Flexibility does not extend to prices, availability, possessions, memories, commitments, or outcomes.

## Content hierarchy

### Current prototype registry

Prompt 8A establishes `day-00` through `day-30` as stable season identifiers. The identifier, not an array position, is save and evidence authority. Each slot owns its countdown offset, implementation status, practical objective, primary communicative move, support prominence, and reviewed Pocket Deck mapping. Implemented slots additionally point to a scene, deterministic handler, turns, outcomes, and local audio. Planned slots are intentionally non-playable.

The current implemented set is Day 0, Days 1–7, Day 13, and Day 21. Legacy saves containing `hotel`, `beach`, `cafe`, `bartender`, or the original scene indices migrate by stable turn/episode identity. Hydration rejects cross-episode turns, outcomes, pending outcomes, and malformed episode evidence.

### Season

A preparation journey defines the trip profile, departure countdown, prioritization policy, sequence and dependency graph, recurring rehearsal cast and places, global language progression, support progression, Pocket Deck composition rules, and transition into Trip Mode. It owns up to 30 pre-departure sessions plus onboarding and final rehearsals.

### Session definition

A session is one approximately ten-minute preparation unit. It may contain several brief activities and encounters. It specifies:

- player-facing practical objective and why it matters now;
- hidden learning intentions and recurrent structures;
- entry requirements and fallback entry variants;
- initial time, location, known facts, available resources, and relevant prior state;
- ordered or conditional encounters;
- episode-level success, partial, abandoned, and recovery conditions;
- allowed world-state effects and callbacks;
- support policy and intended listening conditions;
- completion reflection and competence evidence to retain;
- the Pocket Deck card to add, strengthen, deprioritize, or review;
- canonical replay policy; and
- content version and review status.

A session is not a script. It provides a bounded space of scenes, teaching transitions, listening checks, choices, and consequences with enough authored variants to honor meaningful prior state.

### Encounter definition

An encounter is a coherent practical interaction with one main NPC role and one immediate goal. It declares:

- entry facts and preconditions;
- the NPC’s role goal, knowledge, patience, tone range, and boundaries;
- required and optional information slots;
- communicative intents the player may express;
- turn/beat structure and which beats are truly optional;
- listening line purposes and approved content variants;
- ambiguity thresholds and repair behavior;
- allowed outcomes and their exact effects;
- exits available at each beat;
- corrections that may be useful afterward; and
- test cases, including terse, mixed-language, contradictory, unsupported, and off-topic inputs.

The default encounter cycle is one NPC turn, one player response, one interpretation proposal, and one validated resolution. More cycles require a practical reason such as unresolved identity, two separate receipt errors, or a player-chosen optional conversation.

## Trip profile and departure clock

The trip profile stores only information that materially improves preparation:

- departure date and trip length;
- broad region or home-base label;
- solo/group context;
- lodging type;
- likely transportation and activities;
- minimal versus more social preference;
- specific concerns; and
- profile version and completion state.

The departure clock derives days remaining and scheduling urgency. It never creates streak debt. A prioritization decision should be explainable from situation likelihood, consequence, prerequisites, observed difficulty, and remaining time.

The initial profile must not store passport data, payment-card details, complete booking documents, or unrestricted itinerary content.

## Pocket Deck and trip pack

A Pocket Deck card represents one stable real-world intent, not an encounter outcome. It includes English intent, primary/short Italian, audio references, likely response, listening cues, category/search terms, source, personal reminder, pin state, offline status, content version, and the rehearsal evidence that justified inclusion.

The trip pack is a versioned portable collection of selected cards and offline assets. Rehearsal Mode may modify its draft; Trip Mode consumes an installed snapshot. The same conceptual pack should be usable by a later native client without importing rehearsal conversation history.

## Objectives

Each objective has a player-facing result, not a language-production requirement. It distinguishes:

- **essential result:** what must be true for practical completion;
- **quality constraints:** acceptable cost, timing, item, or certainty;
- **optional result:** information or familiarity the player may pursue;
- **failure and abandonment meanings:** how the world proceeds if incomplete; and
- **evidence opportunity:** the hidden communicative moves and listening details being sampled.

“Rent one chair and one umbrella for today without paying for a two-chair package” is an objective. “Use `vorrei` and correct noun gender” is not.

## Communicative targets

A target describes a move in context—request, refuse, clarify, compare, correct, explain, refer to a promise, or leave—plus:

- likely Italian frames, as examples rather than passwords;
- required semantic details for this encounter;
- acceptable minimal fragments;
- possible English-noun substitutions;
- likely Spanish interference;
- listening forms the NPC may use;
- prior exposure and intended recurrence role; and
- evidence conditions for dormant, recognizable, or active use.

Targets never require an exact sentence. An author can mark a phrase as useful modeling material without making it a gate.

## NPC constraints

An NPC content definition separates durable character facts from encounter behavior.

### Durable character facts

Role, work context, communication style, languages they plausibly use, authored personal facts, relationship boundaries, and which validated events they may remember.

### Encounter-specific constraints

What the NPC wants now, what they know now, permissible offers and remedies, price/availability facts they may state, how many necessary clarifications they can ask, and when they must accept an exit.

### Prohibitions

Facts they cannot invent, topics they cannot pursue, outcomes they cannot promise, sensitive inferences they cannot make, and pedagogical behaviors they cannot impose. For example, the hotel clerk cannot withhold a valid key to ask why the player is visiting Italy.

## Allowed outcomes

An allowed outcome is an authored state-transition option. It includes:

- required interpreted intent and essential details;
- required world preconditions;
- confidence or confirmation rule for consequential details;
- exact money, time, location, inventory, reservation, relationship, fact, and commitment effects;
- player-facing consequence language;
- episode transition or recovery route;
- evidence to record; and
- whether the outcome is canonical, practice-only, or admin simulation.

Outcomes may be successful, partial, awkward, expensive, clever, misunderstood, failed, or intentionally abandoned. The label never substitutes for exact effects.

If no allowed outcome matches confidently, the runtime does not improvise a mutation. It asks an authored clarification, offers a constrained repair, or preserves state and lets the player exit.

## Support settings

Support is declared per encounter and can be adapted per player:

- replay count and whether replay restarts the whole line or a chunk;
- careful-speed audio behavior and control prominence;
- transcript reveal timing;
- optional English meaning as late recovery or reflection;
- visible context such as receipt, map, product card, calendar, or gesture;
- move cues that name possible actions without supplying a required sentence;
- phrase models available on request;
- accessibility overrides; and
- conditions for making a support more or less prominent next time.

The support record distinguishes availability from use. A successful outcome after transcript reveal is a valid life success and transcript-assisted listening evidence.

## Audio and transcript assets

Each authored NPC line or approved variant needs:

- speaker and encounter purpose;
- canonical Italian text;
- audio asset or generation recipe/version;
- normal-speed and careful-speed renditions or an approved high-quality careful-playback method;
- timing/alignment metadata sufficient for replay and display;
- acoustic scene and intelligibility target;
- pronunciation/name review notes;
- content version and quality-approval status; and
- fallback behavior when an asset is unavailable.

The transcript must represent what the audio actually says. A slower rendition should sound like careful speech, not distorted time-stretching, when quality permits. Ambient sound is a separate controlled layer so the target voice can remain accessible.

Dynamic NPC language may only use audio when its spoken form and matching transcript can be kept together. For early validation, bounded pre-produced lines are preferable to unconstrained generated speech.

## Correction records

A correction record captures:

- the interpreted communicative intent and any uncertainty;
- the single issue selected and why it outranked alternatives;
- “what we understood” in concise player-facing language;
- one natural Italian expression;
- one contextual variation and its tone/use;
- whether the response contains English substitution or likely Spanish crossover;
- whether feedback was shown, deferred, dismissed, or omitted;
- links to the communicative target and encounter evidence; and
- content/model version for later audit.

It does not become a permanent list of everything wrong with a response. Raw typed text should follow a defined retention policy rather than being copied indiscriminately into character memory.

## Player competence profile

The competence profile is a collection of provisional evidence, not a level or score. It organizes observations by:

- communicative move and context;
- listening versus reading versus typed retrieval;
- speaker familiarity and acoustic conditions;
- support used before correct action;
- essential-detail accuracy;
- spontaneous, mixed-language, imitated, or repaired production;
- recurrence and transfer across episodes;
- English-noun substitution patterns;
- Spanish interference patterns;
- clarification and recovery behavior; and
- player-selected support/accessibility preferences.

Summaries use claims backed by encounters, such as “understood a changed departure time after one replay on two occasions.” Evidence can decay in confidence or remain uncertain; it should not be silently converted into permanent mastery.

## Authoritative world state

World state contains only game-owned facts:

- canonical day, time, and current location;
- money and exact transaction history;
- inventory, keys, tickets, rentals, and return obligations;
- reservations, bookings, availability, and time windows;
- episode availability, completion, and canonical branch;
- known information such as a stated closing time or temporary stop;
- apartment and service conditions;
- qualitative character relationship descriptors;
- commitments and callbacks;
- selected player preferences explicitly established in play; and
- content/state version plus save history.

Every applied mutation names the authored outcome that authorized it. Conversation text alone is never the source of truth.

## Character memory

Character memory is a curated projection of canonical state. A memory item records:

- the character who can know it;
- the validated fact or event;
- how the character learned it;
- whether it is certain, believed, corrected, private, or expired;
- approved callback uses; and
- whether the player has corrected or revoked an assumed preference.

Examples include “Giulia corrected both the drink and receipt on Day 13” or “the player said they might attend Saturday’s event.” It must not summarize the player as “unfriendly,” infer a biography from errors, or remember an outcome that occurred only in practice replay.

## Commitments and callbacks

A commitment represents an explicit world obligation:

- responsible party;
- promised action;
- creation encounter and exact wording/meaning as validated;
- due date or window;
- dependencies;
- status: open, fulfilled, changed with agreement, breached, waived, or disputed;
- allowed remedies; and
- episodes or encounter variants that can reference it.

A callback is an authored opportunity to mention a commitment, event, preference, or consequence. Before rendering, it rechecks the current canonical fact. Every callback needs an absent/conflicting-state fallback so a generated character never fabricates continuity.

## Replay and audit information

Three distinct replay modes prevent practice from corrupting the story:

- **Resume canonical:** continue from the last committed encounter state.
- **Practice replay:** run an encounter against a snapshot; show feedback but discard all world mutations and mark competence evidence separately or not at all, according to the chosen policy.
- **Canonical restart:** explicitly roll back an episode to its recorded entry snapshot, display the consequences of replacing that episode’s later state, and require confirmation.

Admin simulation can start from an authored or synthetic state and never writes to the player’s canonical timeline.

Audit information should make each turn explainable: content version, input reference under retention policy, support used, interpretation proposal, confidence/ambiguities, selected rule, before/after state summary, correction, latency/failure markers, and admin overrides. Sensitive data and full raw prompts are not automatically retained.

## Admin authoring and testing needs

The internal mode must support:

- unlock any day without changing the real-time release schedule;
- launch an episode with a saved, minimal, contradictory, or synthetic prior state;
- inspect preconditions, NPC knowledge, allowed intents, outcomes, exits, and state diffs;
- replay any normal/slow audio with transcript and asset version;
- substitute interpretation results to exercise each rule deterministically;
- inspect why a callback did or did not appear;
- restart, branch, and compare runs without touching canonical player state;
- review terse, mixed-language, Spanish-interference, ambiguity, refusal, and exit cases;
- flag content/model failures and attach audit evidence;
- test degraded modes such as model timeout, missing audio, save conflict, or low confidence; and
- verify that every required episode path has an authored recovery.

Admin tools are part of the first architecture but need only the functions necessary to test the first playable slice.

## How constrained authoring still permits flexible language

Consider the beach rental encounter.

| Authored constraint | Flexible player expression | Runtime responsibility |
|---|---|---|
| Available outcomes are one-chair custom rental, standard two-chair package, chair-only, or leave | `Vorrei una sedia e un umbrella`, `Solo uno`, `No package`, or a natural full sentence | Propose request/refusal intents and normalize likely object references |
| Quantity and duration are consequential | Fragments, corrections, or words in any order | Surface ambiguity; do not treat a low-confidence `one/two` as confirmed |
| Prices and equipment stock are canonical | Player may ask, bargain, misunderstand, or mention another price | Retrieve authored price/stock; reject invented discounts unless an outcome allows one |
| Nadia can offer the standard package but cannot interrogate the player about being alone | Player may ignore, decline, explain, or leave | Keep NPC response within role goal and honor exit immediately |
| Money and rental obligation change only after confirmation | `Va bene`, card choice, or correction before charge | Match an allowed outcome, validate funds, and atomically apply exact effects |

The model is free to recognize that `Un chair, non due` means a one-chair preference. It is not free to decide the price, charge the player, invent a discount, or conclude that Nadia now considers the player a friend.

## Conceptual turn protocol

1. The game assembles an encounter view from canonical state and approved content.
2. The client plays an authored NPC line and records support actions.
3. The player submits a typed response or an explicit interface action such as replay, transcript, or leave.
4. The interpreter proposes intent, semantic slots, correction candidates, confidence, and ambiguity.
5. The orchestrator checks the proposal against encounter permissions and current state.
6. If essential information is uncertain, an authored repair turn is selected without mutation.
7. If an allowed outcome matches, the state service applies its effects atomically and records the audit event.
8. The NPC realization and correction layer describes only that validated result.
9. The client renders the consequence and makes exit or a clearly optional next beat available.

The same submitted turn must not be applied twice after a retry. Save conflicts resolve against the authoritative event history, not by asking the language model to merge realities.

## Content invariants

- Every consequential mutation maps to one reviewed allowed outcome.
- Every required objective has at least one minimal-language completion path and one recovery/exit path.
- Every optional conversational beat is labeled and skippable.
- Every promise is represented as a commitment, not only dialogue text.
- Every memory callback checks a current canonical fact and has a fallback.
- Every audio line has an exact transcript and a defined failure fallback.
- Every competence claim cites evidence and conditions.
- Every canonical replay or rollback is explicit.
- No generated noun, time, price, availability, relationship, or past event becomes true merely because it appeared in dialogue.

## Provisional decisions requiring implementation validation

- Prefer event-style audit history plus current projections; exact storage design is deferred.
- Prefer reviewed authored NPC lines and bounded variants for the first slice; the eventual degree of dynamic realization is unresolved.
- Record qualitative relationship descriptors and explicit memories, not numerical affinity.
- Retain only the minimum raw typed language needed for personal review and evaluation; exact retention duration needs a privacy decision.
