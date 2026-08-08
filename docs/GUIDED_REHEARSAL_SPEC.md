# Guided Rehearsal Specification

## Purpose

Rehearsal Mode should feel like a calm trip-preparation coach wrapped around believable coastal situations. It is more guided than an open simulation and more alive than a lesson list.

The player should always know:

- why today’s preparation matters for the trip;
- what practical situation is being rehearsed;
- what to do when the Italian disappears;
- what changed because of the player’s choice;
- what language is worth carrying forward; and
- how today improved the Pocket Deck.

## Session frame

Each session is anchored to the departure countdown, not an abstract course day.

The session header should show:

- days until departure;
- today’s preparation theme;
- approximate time required;
- why the situation is likely or high value; and
- the Pocket Deck card expected to be added or strengthened.

A session may contain two to five short activities. Individual NPC exchanges should usually last 20–90 seconds.

## Activity types

### Encounter

Listen, respond, and produce a practical outcome inside a bounded scene.

### Quick refresher

Pause the scene when the player uses an English action frame, Spanish frame, or explicit help control. Teach one reusable pattern and return to the same turn without state mutation.

### Listening check

Replay a known intent with a different short line, speaker, or wording. Ask only for the essential meaning or practical choice.

### Choice and consequence

Choose between cost, time, convenience, quantity, or social engagement. Language is used to make the choice; the consequence makes it memorable.

### Recovery drill

Practice not understanding, asking for repetition, correcting a detail, requesting an alternative, or leaving cleanly.

### Pocket Deck review

Show the card created or updated from the session. Let the traveler keep, shorten, pin, or defer it.

## The teach-and-resume loop

The implemented teaching layer establishes the required contract:

```text
NPC turn → player reaches for English → scene pauses → one Italian frame is taught
→ player inserts or rebuilds it → same NPC turn resumes → consequence remains rule-bound
```

Rules:

- English fallback is not logged as a failed world action.
- No money, time, inventory, relationship, or episode state changes while teaching is open.
- Teach one high-frequency frame, not a grammar lecture.
- Show a scene-specific complete example and its English meaning.
- Preserve the option to build the response independently.
- Record refresher use as support evidence, never as a penalty.
- Recur with the same frame later using a new noun, speaker, or complication.

The initial reusable toolkit contains:

- `Mi serve / Mi servono` — I need;
- `Vorrei` — I would like;
- `Sono` — I am;
- `Ho` — I have;
- `Devo` — I need to / have to;
- `Posso / Può` — can I / could you;
- `Dov’è` — where is;
- `Quanto costa` — how much;
- `Non capisco` — I do not understand;
- `Sì / Va bene` — confirm;
- `No, grazie` — decline; and
- `Pago / Con la carta` — pay.

## Guidance without phrase passwords

Guidance supplies building blocks, not required exact sentences.

- A good Italian fragment remains valid without opening a lesson.
- Italian structure plus an English noun may resolve when consequential details are clear.
- A fully English action frame opens teaching before the NPC or world reacts.
- A scene-specific suggested sentence is a bridge, not the only accepted answer.
- Consequential ambiguity still requires an NPC clarification after the player returns to the scene.

## Progression across the countdown

### 30–21 days before departure: predictable transactions

Make support prominent. Establish request, quantity, pay, location, time, confirmation, refusal, and exit frames.

### 20–11 days: ordinary variation

Change wording, speaker, option, or one expected detail. Recur with the same moves without always showing the phrase first.

### 10–4 days: friction and recovery

Prioritize wrong orders, unavailable items, changed departures, fast speech, failed cards, and recovery language.

### Final three days: full-trip rehearsals

Combine several short encounters into coherent travel-day flows. Use unfamiliar wording and voices so success cannot depend on one memorized script.

## Missed-day behavior

The system calculates preparation priority from departure date, likely trip situations, prerequisites, and observed difficulty.

If time compresses:

1. retain recovery language and the most likely high-consequence situations;
2. combine compatible transaction practice;
3. remove optional familiarity before essential preparation;
4. offer a short session rather than an overdue backlog; and
5. preserve at least one final multi-encounter rehearsal.

No missed-day copy should imply failure, debt, or a broken streak.

## Session completion

A session ends with a concise preparation summary:

- practical situations handled;
- one or two reusable moves practiced;
- support used without judgment;
- one recovery behavior strengthened;
- Pocket Deck card added or improved; and
- what is likely to recur next.

Do not end with a score, celebratory currency, or exhaustive error list.

## Evidence retained

Retain only evidence useful for adaptation and deck composition:

- encounter outcome and consequential accuracy;
- audio support used;
- typed response classification: independent, mixed, taught, or repaired;
- refresher frame opened and whether it was inserted or rebuilt;
- essential misunderstanding or clarification;
- successful transfer across contexts;
- repeated Spanish crossover; and
- card creation, pin, edit, or dismissal.

## Current prototype gaps

The existing four-scene prototype now has contextual teaching but still lacks:

- departure-date onboarding;
- a guided multi-activity daily session shell;
- preparation prioritization and missed-day compression;
- session-end review;
- card generation from rehearsal evidence;
- a Pocket Deck surface; and
- Rehearsal/Trip Mode switching.

These are the next lifecycle-proof requirements. More encounters are not the priority until the lifecycle works.

