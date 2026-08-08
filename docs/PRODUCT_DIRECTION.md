# 30 Days to Italy — Product Direction

**Status:** Confirmed organizing direction for the next prototype slice  
**Decision date:** 2026-08-02  
**Initial journey:** One 7–10 day solo vacation in Campania and along the Amalfi Coast  
**Working title:** 30 Days to Italy  
**Tagline:** Your trip starts 30 days before departure.

## Core promise

> Rehearse your trip before you take it, then carry the most useful parts with you.

30 Days to Italy is a personalized vacation-preparation experience. The traveler begins approximately 30 days before departure and spends about ten minutes per day rehearsing likely situations. On or shortly before departure, that preparation becomes a fast, personal, offline-friendly Pocket Deck for use during the trip.

The product is organized around **trip readiness**, not broad Italian mastery. The traveler should become better able to understand what is happening, complete ordinary tasks, recover from confusion, and choose whether to participate in optional conversation.

## What changed

This direction supersedes the earlier premise that the player is literally living a continuous 30-day coastal stay.

- The 30 sessions are a countdown to a 7–10 day vacation, not 30 simulated vacation days.
- The existing coastal encounters remain valuable as rehearsal modules and recurrence material.
- The current web prototype proves the listen → type → teach → consequence loop; it does not yet prove the full product lifecycle.
- The next slice must prove that rehearsal produces a useful artifact for the real trip.
- **Un mese sulla costa** may remain an internal content-season name, but **30 Days to Italy** is the current product-level working title.

## The two-mode lifecycle

### Rehearsal Mode

**When:** Before departure  
**Job:** Build practical readiness through short, guided simulations  
**Default use:** About ten minutes per day

A session combines several short activities:

1. arrive in a likely setting;
2. see one practical objective;
3. listen to a brief Italian turn;
4. respond naturally, with support when needed;
5. pause for contextual teaching when the Italian is unavailable;
6. make a choice involving time, money, convenience, or preference;
7. handle one manageable complication;
8. see the consequence and one useful language takeaway; and
9. add or improve one Pocket Deck card.

The departure date matters more than a perfect streak. If the traveler starts late or misses sessions, the product prioritizes high-value situations, combines compatible material, and protects the final rehearsal period without shame or lockout.

### Trip Mode

**When:** From departure through the end of the trip  
**Job:** Solve real situations quickly  
**Default use:** Find, read, play, show, or pin a card

Trip Mode removes lesson framing, scores, and correction. It opens quickly, works with one hand, uses large high-contrast text, minimizes typing, and keeps essential cards and audio available offline.

The first Trip Mode does not depend on live AI for essential help. Its core material is prepared before departure, constrained, stable, and consistent with what the traveler practiced.

## Initial traveler

The first version is for one concrete traveler who:

- is taking a 7–10 day solo trip to Campania or the Amalfi Coast;
- expects hotels or a rental, beaches, cafés, restaurants, shops, and nearby towns;
- may use ferries, buses, trains, and taxis;
- studied introductory Italian years ago;
- recognizes more Italian than they can produce;
- has substantial Spanish interference;
- reads better than they understand natural speech;
- wants listening and typed practice before speech;
- is reserved and wants polite capability without compulsory sociability; and
- may later consider a longer Italian stay.

This specificity is a product advantage, not a limitation to erase prematurely.

## Guided preparation principles

### Practical objectives remain primary

The player obtains a key, rents a chair, fixes a bill, finds a departure, or ends an interaction. Grammar and recurrence remain internal machinery.

### Teaching appears exactly when needed

If the player falls back to English or cannot retrieve a core action, the scene pauses without mutation. The product teaches one reusable Italian frame in context, lets the player insert it or rebuild it, and resumes the same turn.

### Quiet independence is legitimate

Fragments, refusals, boundaries, and clean exits are authentic success paths. Optional conversation never gates service or progress.

### Recovery matters as much as first-attempt success

The traveler practices `Non capisco`, repetition, clarification, alternatives, corrections, and polite exits. The product must reveal gaps honestly without undermining confidence.

### Preparation creates the Pocket Deck

Every high-value rehearsal should contribute to, improve, or deprioritize a card. The deck is a focused personal artifact, not a generic phrasebook.

## Personalization boundary

Use an initial balance of:

- **70%** reviewed Italian-vacation core;
- **20%** Campanian/coastal context; and
- **10%** individual plans, interaction style, and observed retrieval difficulty.

Personalization may affect situation selection, order, recurrence, complications, listening difficulty, support prominence, and Pocket Deck composition. It should not generate an entire unreviewed course or pretend to know the traveler’s exact hotel, ferry, price, or schedule.

## Stable preparation versus live facts

The product may teach how to ask where a ferry departs, understand that a stop changed, or clarify whether a price covers a full day. It must not present simulated schedules, prices, weather, business hours, or availability as current travel facts.

Live facts require an authoritative current source and explicit labeling. They are not required for the initial lifecycle proof.

## Initial scope

Included:

- one traveler and one coastal trip profile;
- one 30-session preparation arc;
- listening and typed responses;
- contextual teaching and Spanish-interference handling;
- persistent simulated consequences;
- brief corrections;
- a personalized Pocket Deck;
- manual and later departure-triggered Trip Mode;
- offline access to essential cards and audio; and
- Admin replay and state controls.

Parked:

- speaking or pronunciation scoring;
- other languages or journey types;
- complete Italian instruction;
- booking, itinerary, or recommendation systems;
- live transportation guarantees;
- unrestricted live AI translation;
- public accounts, social systems, or generalized productization; and
- native Swift implementation before the lifecycle is validated.

## Definition of readiness

The traveler is increasingly ready when they can complete likely interactions, recognize important times/prices/quantities/changes, use short functional Italian, request clarification, recover from misunderstanding, recognize when communication failed, and find immediate help quickly during the real trip.

Readiness is not fluency, grammatical perfection, or a universal score.

## Current proof and next proof

The current web prototype proves:

- four representative coastal encounters can be played;
- audio-first listening and typed response work in a browser;
- English fallback can become contextual teaching;
- bounded consequences and local persistence work; and
- concise, non-social success paths are viable.

The next vertical slice must prove:

> A guided rehearsal session can create a small, useful Pocket Deck that works in a distinct Trip Mode.

