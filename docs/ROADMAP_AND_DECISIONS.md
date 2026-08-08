# Roadmap and Decisions

## Current product call

As of 2026-08-02, the project is organized as **30 Days to Italy**:

> A personalized 30-day rehearsal for a 7–10 day trip to Italy. Before departure, the traveler practices likely situations. During the trip, that preparation becomes a fast, personal, offline-friendly Pocket Deck.

This supersedes the earlier premise of a literal 30-day simulated coastal stay. Existing encounters and recurrence design remain reusable preparation content.

## Decision labels

- **Confirmed:** required for the current direction; changing it requires an explicit product decision.
- **Provisional:** recommended but awaiting evidence.
- **Parked:** outside the active milestones unless explicitly reopened.

## Confirmed decisions

### Product lifecycle

- The 30 sessions occur before departure and prepare for a 7–10 day vacation.
- Rehearsal Mode is guided, audio-first, typed, practical, and consequence-bearing.
- Trip Mode is a distinct quick-reference experience centered on a personal Pocket Deck.
- The next vertical slice must prove that rehearsal creates useful Trip Mode material.
- The departure date drives prioritization; missed sessions never create streak debt.
- **30 Days to Italy** is the product-level working title. **Un mese sulla costa** may remain an internal content-season name.

### Traveler and learning

- The first traveler is solo, reserved, Campania/Amalfi-bound, and preparing for approximately 7–10 days.
- Dormant introductory Italian, stronger reading than listening, limited retrieval, and Spanish interference shape the initial experience.
- The first version uses NPC audio and typed player responses. There is no player speech, microphone access, or pronunciation scoring.
- Practical objectives are visible; grammar and recurrence remain hidden design machinery.
- Quiet independence is a first-class success path. NPCs honor fragments, boundaries, and clean exits.
- Normal replay, careful replay, transcript, contextual teaching, and a reusable phrase toolkit remain available without penalty.
- Fully English action frames pause the scene for one contextual teaching moment before the NPC or world reacts.
- Meaning-changing corrections appear automatically after resolution; naturalness-only notes stay collapsed.
- Progress is evidenced by outcomes, listening, support, transfer, recovery, and useful Pocket Deck composition—not XP or a universal score.

### State and safety

- Authored rules own money, time, location, inventory, reservations, commitments, memory, consequences, trip dates, and deck contents.
- A model may propose intent and bounded language but cannot mutate canonical state or invent authoritative facts.
- Rehearsal, practice, Admin, and Trip Mode are distinct state contexts.
- Simulated businesses, prices, schedules, and disruptions never masquerade as live travel facts.
- Essential Trip Mode cards and audio must not depend on live AI or network access.
- The first profile does not request passport data, payment-card data, booking documents, or unrestricted itinerary access.

## Provisional decisions

| Decision | Current recommendation | Evidence still needed |
|---|---|---|
| Product name | Use **30 Days to Italy** | Brand/title test after lifecycle slice |
| Content-season name | Keep **Un mese sulla costa** internally if useful | Whether dual naming aids or confuses production |
| Home-base fiction | Keep Marina di Lume and current recurring cast as rehearsal continuity | Campania-informed cultural/geographic review |
| First lifecycle scene | Use the current beach encounter | Does it create a genuinely useful deck card? |
| Deck size for slice | 8–12 cards | Retrieval speed and perceived clutter |
| Personalization mix | 70% core, 20% coastal, 10% individual | Usefulness during seven-session pilot |
| Persistence | Local for lifecycle proof; authoritative service before canonical pilot | Multi-device need, privacy, and conflict evidence |
| NPC audio | Reviewed pre-produced lines and bounded variants | Human versus generated quality/cost comparison |
| Mode transition | Manual in slice; departure-driven suggestion later | Whether travelers want early or delayed Trip Mode |
| Native client | Reconsider only after web field validation | Offline, launch, audio, or accessibility blockers |

## Parked features

- speaking, pronunciation, or accent scoring;
- other languages, study abroad, work, or relocation journeys;
- comprehensive Italian curriculum or certification;
- live booking, complete itinerary, mapping, or recommendation systems;
- live transportation, weather, business-hour, or price guarantees;
- unrestricted live AI translation;
- fully generative runtime audio;
- multiplayer, social graphs, leaderboards, streak rewards, or XP;
- public accounts, subscriptions, analytics, or broad productization;
- native Swift work before lifecycle and field validation; and
- all 30 sessions before the lifecycle and seven-session gates pass.

## Principal risks and gates

| Risk | Why it matters | Gate or mitigation |
|---|---|---|
| Rehearsal feels like a quiz | Breaks the vacation-preparation promise | Observe whether the user talks about situations and readiness, not correct answers |
| Guidance becomes phrase passwords | Produces memorization without transfer | Accept flexible Italian; recur with new nouns/speakers/complications |
| Simulation understands too much | Creates false confidence | Honest thresholds, bounded clarification, alternate voices/wording, recovery practice |
| English fallback advances the world | Skips learning and can mutate the wrong outcome | Teach-and-resume must preserve the current turn and all state |
| Pocket Deck is just a phrasebook | Fails to justify the lifecycle | Each card needs trip relevance, rehearsal evidence, recovery value, or a manual pin |
| Deck becomes cluttered | Slows real use | Small ordered pack, categories, search, recent/pinned priority, dismissal |
| Missed days become punitive | Adds stress before travel | Priority compression, optional-content removal, no overdue backlog |
| Simulated facts appear live | Can mislead during travel | Stable-language boundary and explicit offline-pack provenance |
| Trip Mode depends on connectivity | Fails when most needed | Offline card/audio acceptance test before pilot |
| Personalization becomes uncontrolled generation | Produces inconsistent, unreviewed material | Assemble/adapt reviewed core; keep itinerary contribution bounded |

## Milestone roadmap

### 1. Foundation and interaction proof — complete

Delivered:

- product, learning, content/state, technical, and content-map documents;
- a playable local web prototype;
- four representative encounters;
- fixed normal/careful audio;
- typed response interpretation and bounded consequences;
- save/resume and Admin controls;
- contextual teaching for English fallback;
- a 12-pattern phrase toolkit; and
- build, automated, desktop/mobile, and end-to-end validation.

This proves the central encounter loop, not yet the two-mode product.

### 2. Guided lifecycle vertical slice — complete in the private prototype

**Scope:** minimal trip profile, departure countdown, Prepare/Trip shell, one guided beach session, session review, 8–12 card draft deck, English search, pinning, card audio, large-text view, and local/offline persistence.

**Exit gate:**

- one rehearsal creates or strengthens a card;
- the card’s personal reminder is grounded in observed practice;
- the user can find it by category and English intent;
- normal/careful audio and show view work;
- manual mode switching preserves both states;
- no teaching/correction UI leaks into Trip Mode;
- essential cards remain usable offline; and
- the user judges at least one card realistically useful during travel.

### 3. Seven-session private pilot — implementation complete; personal use pending

**Entry:** lifecycle slice passed and the user chose to continue.

**Implemented scope:** Day 0 plus Days 1–7 are playable, with the existing Day 13 and Day 21 anchors retained. The season registry contains all 31 stable IDs, the deck contains 15 focused cards, and Admin can traverse all ten implemented episodes without waiting. The exit gate still requires the user’s actual personal run; automated completion is not field evidence.

**Exit gate:**

- high-value moves transfer across contexts;
- missed-day compression works without pressure;
- deck growth remains understandable and small;
- support evidence can guide recurrence without a score;
- no consequential misinterpretation, fabricated fact, or save loss remains; and
- the user wants to attempt the complete preparation journey.

### 4. Thirty-session personal preparation

**Entry:** seven-session evidence supports expansion and content review capacity is available.

**Scope:** one actual month-long countdown including late starts, missed days, compressed scheduling, final multi-encounter rehearsals, and departure transition.

**Exit gate:**

- all high-priority trip situations have practical/recovery coverage;
- alternate wording and voices prevent script memorization;
- the trip pack remains focused and complete;
- the transition occurs cleanly at departure; and
- there is a written readiness and field-validation decision.

### 5. Field validation

Test Trip Mode under poor connectivity, bright light, noise, time pressure, one-handed use, and fast retrieval. Record actual situation coverage and missing-card needs without presenting anecdotal use as broad validation.

### 6. Broader product or native decision

Only after field validation should the project consider other travelers, destinations, journey types, public launch, or a native client. Any expansion requires a new product contract naming the proven need.

## Immediate recommendation

Do not add more encounters next. Build the smallest rehearsal-to-Pocket-Deck handoff described in [`NEXT_SESSION_HANDOFF.md`](NEXT_SESSION_HANDOFF.md), use it, and decide whether the Pocket Deck creates meaningful value beyond an ordinary phrasebook.
