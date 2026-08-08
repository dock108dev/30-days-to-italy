# Next Session Handoff

**Prepared:** 2026-08-02  
**Current call:** The two-mode lifecycle and first guided beach session work; the next job is to prove the rehearsal-to-Pocket-Deck handoff.

## Where the project stands

Completed today:

- a playable local web prototype with four coastal encounters;
- fixed normal and careful-speed audio;
- typed free-form response handling;
- exact local consequences and save/resume;
- Admin launch/restart controls;
- a contextual teach-and-resume layer for English fallback;
- a 12-pattern reusable phrase toolkit;
- desktop/mobile and end-to-end browser validation; and
- updated direction for pre-departure rehearsal plus Trip Mode.

Completed on 2026-08-03:

- a versioned, device-local trip profile with safe defaults;
- a timezone-safe departure countdown;
- first-run setup, saved-trip summary, later editing, and full reset behavior; and
- independent trip/rehearsal persistence with regression coverage.
- persistent Prepare and Trip modes with a clearly non-teaching Trip surface;
- one complete guided beach session with contextual `Mi servono` recovery;
- evidence-based outcome and useful-language review; and
- independent, malformed-safe guided-session persistence and full-reset coverage.

The current app remains the first Rehearsal Mode interaction proof. Do not discard or redesign its encounter engine before wrapping the lifecycle around it.

## Next implementation objective

> Turn one existing rehearsal into a useful Pocket Deck card, then consume that card in a clearly different Trip Mode.

This is the smallest slice that tests the new product thesis.

## Recommended build order

### 1. Add a minimal trip profile — complete

Collect only:

- departure date;
- trip length;
- region/home-base label;
- solo versus accompanied;
- lodging type;
- likely transport;
- beach plans; and
- minimal versus more social preference.

Use defaults so setup takes under two minutes. Do not request bookings, email, passport, or payment information.

### 2. Add the lifecycle shell — complete

Create two visibly distinct top-level modes:

- **Prepare** — countdown, today’s guided session, current readiness focus;
- **Trip** — Pocket Deck, pinned/recent cards, categories, English search.

Use manual switching for the slice. Save mode and profile locally.

### 3. Wrap the beach encounter as one guided session — complete

Use the existing beach flow because it already exercises:

- `Mi serve / Mi servono`;
- quantity ambiguity;
- the wrong two-chair package risk;
- price confirmation;
- English fallback teaching; and
- a concrete Pocket Deck reminder.

Session sequence:

1. explain why the beach situation matters;
2. run the encounter;
3. include one recovery/refresher moment;
4. show the outcome;
5. summarize the useful language; and
6. mark the practiced material as ready for the beach card without creating a fake card.

### 4. Build the smallest real Pocket Deck — next

Seed the 8–12 cards listed in [`TRIP_MODE_AND_POCKET_DECK.md`](TRIP_MODE_AND_POCKET_DECK.md). Implement category browsing, simple English search, pinning, normal/slower audio, and large-text show view.

The beach card must visibly carry forward whether the traveler needed the `Mi servono` refresher.

### 5. Validate the handoff

Test this complete path:

1. create the trip profile;
2. enter Prepare mode;
3. complete or partially complete the beach rehearsal;
4. see the deck card added or strengthened;
5. switch to Trip Mode;
6. find the card by category and English search;
7. play both audio versions;
8. open the large-text view; and
9. reload offline/local state without losing the card or pin.

## Definition of done for the next slice

- The user understands the departure countdown and today’s preparation goal.
- English fallback still pauses teaching without changing the scene.
- One existing encounter produces visible deck value.
- Prepare and Trip modes feel behaviorally different.
- The deck is small, searchable, and useful—not a phrase dump.
- A card’s personal reminder is grounded in actual rehearsal evidence.
- Essential card text/audio is local and does not require live AI.
- Existing consequence, audio, save, and Admin regression checks still pass.

## Explicitly not next

- more than the current four encounters;
- all 30 sessions;
- live itinerary imports;
- real ferry or weather data;
- external model integration;
- accounts or multi-device sync;
- public deployment;
- microphone or pronunciation work;
- native Swift work; or
- visual polish unrelated to the lifecycle proof.

## First decision after the slice

After using the lifecycle slice, make one of three calls:

- **Proceed:** the rehearsal-to-deck handoff is genuinely useful; expand to seven guided sessions.
- **Revise:** the interaction is useful but the deck selection or Trip Mode retrieval is weak; fix and rerun.
- **Stop:** the Pocket Deck does not create enough additional value over ordinary notes or a phrasebook.
