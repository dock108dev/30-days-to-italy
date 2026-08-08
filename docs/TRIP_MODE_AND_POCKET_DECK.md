# Trip Mode and Pocket Deck Specification

## Product job

Before departure, the traveler rehearses. During the trip, the product becomes a fast personal reference built from that preparation.

Trip Mode is not a smaller Rehearsal Mode. It removes teaching, correction, scores, extended simulation, and unnecessary typing. Its job is to help the traveler act under time pressure.

## Mode transition

The first vertical slice uses a manual mode switch so both experiences can be tested immediately. A later version may suggest the transition shortly before the saved departure date and activate it automatically on departure, but the traveler must be able to activate early, delay, and return to rehearsal intentionally.

Transition copy:

> Your practice has been turned into a personal Italy deck. Everything important is available here during your trip.

Switching modes does not erase rehearsal history. Trip Mode consumes a prepared trip pack derived from it.

## Pocket Deck composition

The deck combines:

- reviewed core travel cards;
- situations selected for this trip;
- structures practiced successfully;
- phrases repeatedly needed or forgotten;
- recovery language;
- cards the traveler pinned;
- short personal reminders; and
- useful variations approved during rehearsal.

The deck remains intentionally small. A card must earn inclusion by relevance, observed need, recovery value, or manual pinning.

## Initial categories

- Hotel
- Transportation
- Beach
- Food and drink
- Paying
- Shopping
- Problems
- Pharmacy
- Polite exits
- Help me understand

The first slice needs only categories represented by the current encounters plus recovery and payment.

## Card anatomy

Every card has:

- plain-English intent;
- primary Italian phrase in large text;
- short version;
- normal-speed audio;
- careful-speed audio;
- one optional polite or firm variation;
- one likely response;
- two or three words to listen for;
- category and search terms;
- source: core, rehearsal, pinned, or personal;
- offline-availability status; and
- optional personal reminder.

Optional actions:

- play audio;
- play slower audio;
- open large-text “show this” view;
- pin/unpin;
- mark helpful;
- add a short note; and
- return to categories or recent cards in one action.

## Example card

**Intent:** I need one beach chair and one umbrella.

**Primary**  
`Mi servono un lettino e un ombrellone.`

**Shorter**  
`Un lettino e un ombrellone, per favore.`

**Likely response**  
`Per tutta la giornata?`

**Listen for**

- `tutta la giornata` — the whole day
- `due lettini` — two beach chairs
- `chiusura` — closing

**Personal reminder:** Watch for the standard two-chair package; confirm the quantity before paying.

## Trip Mode navigation

The default home view prioritizes:

1. pinned cards;
2. recent cards;
3. large situation categories;
4. simple English intent search; and
5. recovery/help cards.

Search is bounded to the installed trip pack in the first version. It does not silently become a live AI translator.

## Usability requirements

Trip Mode must:

- open quickly;
- work with one hand;
- use large tap targets and high-contrast text;
- remain legible in bright sunlight;
- minimize navigation depth and typing;
- make audio usable in a noisy environment;
- keep essential cards available without network access;
- show whether a card is stored offline; and
- distinguish stable language help from any future live information.

The primary card must be reachable within three taps from Trip Mode home. Pinned and recent cards should require fewer.

## Trip-pack contract

The trip pack is a portable, versioned package that can later be consumed by either the web app or a native client.

Conceptual contents:

- pack identifier and version;
- trip start/end dates and region label;
- content version and generated timestamp;
- ordered categories;
- ordered card identifiers;
- card text and listening cues;
- local references to normal/careful audio;
- pins and personal reminders;
- rehearsal evidence used for selection;
- offline asset manifest and integrity metadata; and
- a clear statement that simulated facts are not live travel data.

The pack must not contain passport data, payment-card data, full booking documents, or unrestricted raw conversation history.

## Offline boundary

Essential cards, search metadata, and their audio must work without contacting a model or network service. The first lifecycle slice may simulate installation using browser storage and cached assets, but it must preserve the eventual portable-pack boundary.

Offline success means:

- the pack opens after connectivity is removed;
- installed audio still plays;
- search and categories still work;
- pins and local notes remain available; and
- the UI does not mislabel old simulated details as live facts.

## Stable versus live information

Allowed stable content:

- how to ask where a ferry departs;
- how to understand a changed stop;
- how to ask whether a price is for the full day;
- how to correct an order; and
- how to ask for repetition.

Excluded unless backed by a current authoritative source:

- timetables;
- prices;
- business hours;
- weather;
- operator rules; and
- real-time availability.

## Current-slice deck

The next vertical slice should produce approximately 8–12 cards from the current prototype:

1. check in under a reservation name;
2. ask for repetition;
3. say you are tired and end the conversation;
4. request one beach chair and one umbrella;
5. confirm one, not two;
6. say an order is wrong;
7. dispute an extra bill item;
8. pay by card;
9. accept the usual;
10. postpone optional conversation;
11. say you do not understand; and
12. ask how much something costs.

At least one card must be strengthened by an observed refresher need, and at least one must be manually pinned.

## Lifecycle acceptance gate

The small vertical slice passes when:

- a rehearsal action creates or strengthens a card;
- the user can see why that card was selected;
- manual mode switching preserves rehearsal and deck state;
- the deck can be searched by simple English intent;
- a card supports play, slower play, and large-text display;
- the essential small deck remains usable offline;
- no lesson or correction UI leaks into Trip Mode; and
- the user judges at least one card useful enough to imagine using during the actual trip.

