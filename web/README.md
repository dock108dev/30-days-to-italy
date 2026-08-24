# 30 Days to Italy — owner-only first-user beta

This is the private, mobile-friendly first-user beta of the **30 Days to Italy** lifecycle. A stable `day-00` through `day-30` season registry drives scheduling, persistence, Admin navigation, and episode selection. All 31 sessions are playable. Trip Mode is a real, non-teaching Pocket Deck with 30 reviewed core cards for fast help during the trip.

The current build includes trip onboarding, daily countdown scheduling, persistent Prepare/Trip switching, independent registered episode definitions, a generic deterministic coordinator, a guided beach loop, and observational episode-to-deck handoff. Its quiet coastal interface keeps one primary action on each screen and moves secondary help into disclosures. Completed attempts can strengthen a reviewed mapped card only with moves demonstrated in accepted responses; targets and successful outcomes are never treated as proof.

## What is playable

- Day 0 hotel arrival and key pickup
- Day 1 Casa Limone apartment key and access
- Day 2 minimal grocery purchase
- Day 3 first Bar Gabbiano espresso
- Day 4 beach chair and umbrella rental
- Day 5 half-kilo produce purchase
- Day 6 Amalfi bus ticket and stop
- Day 7 bounded pharmacy request
- Day 8 self-service laundry instructions
- Day 9 bus-versus-ferry comparison
- Day 10 wrong side-dish correction
- Day 11 no-hot-water report and exact repair commitment
- Day 12 truthful beach alternative after sold-out umbrellas
- Day 13 wrong café order and incorrect bill
- Day 14 temporary bus-stop change
- Day 15 extra grocery charge correction
- Day 16 parcel collection without the expected document
- Day 17 missed-commitment correction
- Day 18 unavailable pharmacy item and bounded alternatives
- Day 19 ferry cancellation, owned-ticket refund, and replacement transport
- Day 20 temporary hot-water fix and permanent repair commitment
- Day 21 familiar bartender and optional conversation
- Day 22 familiar-vendor recommendation and €4 panino caprese
- Day 23 idempotent second-parcel custody and optional coffee boundary
- Day 24 fictional wind and early beach closure with entitlement-gated remedies
- Day 25 tomorrow-at-19:30 invitation with no invented attendance
- Day 26 quiet-table preference with no implied meal or charge
- Day 27 permanent repair close and eligibility-gated €5 credit
- Day 28 distinct €2.40 two-leg bus plan via Vietri and stand 3
- Day 29 €2 espresso and a truthful undecided future answer
- Day 30 outcome-specific key return, checkout, departure, and season completion
- one-remedy-only Day 24 recovery: a recorded credit or refund consumes the entitlement and survives reload/replay without duplicate value
- separate no-charge Day 29 reviews for leaving before an order versus leaving after ordering but before the personal answer and payment
- a durable Day 30 completion record that survives active or failed replays, Admin episode changes, mode/deck navigation, and reload; only full reset removes it
- normal-speed and careful-speed Italian audio, replay, and transcript support
- typed free-form responses, including terse Italian, English nouns, and common Spanish crossover
- automatic scene-pausing refreshers when the player falls back to English, with a contextual Italian reply that returns to the same conversation
- an always-available, collapsed phrase toolkit for 24 practical patterns, including needs, identity, requests, location, price, instructions, problems, alternatives, duration, prior commitments, recommendations, uncertainty, credits, transfers, checkout, confirmation, declining, and paying
- exact money, inventory, key, commitment, and memory consequences
- automatic meaning-changing corrections and collapsed naturalness suggestions
- device-local save/resume plus a phase-grouped Admin fast-track for all 31 playable episodes and Trip Mode, restart, reset, and state inspection
- timezone-safe daily unlocking: Day 0 is immediate, Day 1 unlocks 30 days before departure, and Day 30 is scheduled one day before; missed unlocked sessions remain available without streak debt
- an under-two-minute trip profile with a timezone-safe departure countdown
- separate local persistence for trip details and rehearsal state, including later editing without progress loss
- persistent Prepare and Trip modes that never alter rehearsal state when switched
- a persistent guided beach session with Situation → Rehearsal → Review progress
- factual review of the result, submitted language, English-fallback refresher use, replays, slower audio, and transcript use
- an explicit practice-again path that starts a clean attempt without losing the trip profile
- an explicit **Carry this into my Pocket Deck** action for eligible completed episode attempts
- idempotent, bounded rehearsal evidence attached to reviewed mapped cards, with direct opening in Trip Mode
- one deduplicated **Quick access** deck section for practiced, pinned, and recent cards, with factual reminders on card detail
- a real Trip Mode Pocket Deck with 30 reviewed hotel, apartment, beach, food, transport, pharmacy, paying, problem, polite-exit, and understanding cards
- device-local English intent search, situation categories, pinning, six-card recent history, and the full catalog behind **Browse all 30 cards**
- normal and careful local Italian audio for every core card, with text-to-audio transcripts kept in the catalog
- likely replies, English explanations, listening cues, short variants, and a distraction-free large-text **Show this** view
- strict malformed-state recovery under a fifth independent local persistence key
- a no-teaching Trip Mode boundary with no correction, scoring, simulated money, or rehearsal consequences
- an installable production PWA with a truthful **Preparing offline access**, **Ready offline**, **Offline**, or **Offline files unavailable** state
- a content-versioned offline cache containing the application shell, local fonts and icons, all 366 encounter clips, and all 60 Pocket Deck clips

The player never speaks. The app does not request microphone access.

## Run it

From this directory:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Development mode intentionally does not register the production service worker. To exercise installability and offline behavior, use the production build:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001) while connected and wait for **Ready offline** in Trip Mode before disconnecting. A first-ever visit without a connection is intentionally unsupported.

Use **Admin** in the top-right corner from either Prepare or Trip Mode to start an isolated review walkthrough without calendar waiting. The review session snapshots and namespaces all five owner-state domains, generates its phase-grouped checkpoints from the same season registry, and covers all 31 playable episodes plus Trip Mode. Exiting or resetting the walkthrough restores the owner snapshot byte-for-byte; countdown dates are preview-only and never rewrite the saved departure date.

## Owner-only release

The supported module authorities, removed compatibility paths, and retained save migrations are documented in [`docs/ARCHITECTURE_AND_SSOT.md`](docs/ARCHITECTURE_AND_SSOT.md). The current product has one 31-session season; there is no planned-session runtime mode or alternate episode engine.

The repository trust model, fixed findings, accepted risks, deployment checks, and security roadmap are documented in [`docs/SECURITY.md`](docs/SECURITY.md). Owner-only access is enforced by the hosting configuration, not by client-side Admin controls; verify the live access list and response headers against the exact frozen candidate before every release.

- The supported hosted release is an owner-only OpenAI Sites deployment. Public or shared access requires a separate, explicit launch decision.
- The app has no account, server database, analytics, microphone access, or cross-device sync. Trip details and progress stay in this browser's `localStorage`; clearing site data or opening another browser/device starts fresh.
- Search engines are denied by both page metadata and `robots.txt`. The worker adds `nosniff`, no-referrer, disabled microphone/camera/geolocation, and frame-denial headers to document and PWA metadata responses without delaying the offline audio cache.
- Offline use becomes available only after one connected visit reaches **Ready offline** on that exact browser and origin. A first-ever disconnected visit is not supported.
- A release is packaged only after the complete local gate below passes. Each hosted version is tied to its source commit, so rollback means redeploying the prior saved version without changing traveler data stored on the device.

## Validation

Production failure behavior, safe local diagnostics, and incident rules are documented in [`docs/ERROR_HANDLING_AND_OPERATIONS.md`](docs/ERROR_HANDLING_AND_OPERATIONS.md). The app keeps deliberate text/offline recovery paths, but storage failures, invalid saved JSON, cache failures, audio failures, and unexpected render failures are explicit and locally observable without logging traveler data.

```bash
npm run lint
npx tsc --noEmit
npm run test:ssot
npm run test:security
npm run test:response-contracts
npm run test:interaction
npm run test:admin-demo
npm run test:checkpoint-hardening
npm test
npm run test:offline
```

The main test gate creates a production build and covers the single 31-session season contract, daily unlock persistence, all registered encounters, English teach-and-resume safety, v1–v5 game migration into v6, generalized evidence, the canonical Day 0–7 run ending at €51.10, the canonical Day 8–21 run ending at €9.20, and the canonical Day 22–30 run ending at €5.80. Dedicated truth-matrix regressions protect ferry callbacks, parcel custody, attendance, one-time entitlement-gated beach remedies, repair credits, the distinct Day 28 fare, factual Day 29 exit reviews, independent historical-completion validation, replay durability, exact Day 30 issue acknowledgement, qualifying versus non-qualifying completion, isolated Admin review storage, and the exactly-once interaction boundary. The focused response-contract gate derives 57 checks. It also validates every encounter audio pair, deployed-origin social metadata, the 30-card/60-clip Pocket Deck, cache inventory, and production-only worker registration.

`npm run test:offline` starts the production build on an isolated loopback port and drives a real Chromium session through connected preparation, deliberate cache damage and repair, a disconnected reload, all 426 cached audio responses, actual normal/careful card playback, search, categories, rehearsal personalization, pin/Recent persistence, Show-this focus restoration, mode switching, desktop, 390px portrait, and 844×390 landscape. It restores connectivity and shuts down its own server.

## Code boundaries

- `app/game/model.ts` owns shared state/types, phrase content, and response vocabulary. Scene, turn, and outcome callers import their derived catalogs directly from `app/season/registry.ts`.
- `app/game/engine.ts` is a generic coordinator for registered definitions. It owns shared transition mechanics and contains no episode handlers, positional progression, or day-specific seeds.
- `app/game/persistence.ts` owns the stable local save key, strict registry validation, v1–v5-to-v6 migration, independent historical-completion validation, cross-field remedy normalization, relationship/fact separation, and fail-closed recovery. Legacy positions are interpreted only here.
- `app/season/manifest.ts` is the stable 31-slot metadata authority. `types.ts` defines the full authoring and observational-evidence contract, `episodes/` owns all 31 implemented modules, and `registry.ts` derives runtime catalogs and ownership maps. `schedule.ts` owns daily unlocking; `pocket-deck-handoff.ts` copies only the latest attempt's observed evidence.
- [`../docs/EPISODE_AUTHORING_GUIDE.md`](../docs/EPISODE_AUTHORING_GUIDE.md) documents how to revise or replace a current episode without adding a central conditional.
- `app/prototype/PrototypeApp.tsx` coordinates browser state, audio, and the game engine.
- `app/prototype/PrototypeViews.tsx` contains the player-facing encounter, teaching, world, outcome, and Admin views.
- `app/admin/fast-track.ts` owns the ordered Admin lifecycle checkpoints and non-persistent calendar-preview math. `app/admin/truth-previews.ts` owns bounded Admin-only Day 19/21 world-state seeds for direct conditional-path audits.
- `app/admin/demo-conductor.ts`, `app/admin/canonical-demo.ts`, and `app/persistence/session.ts` own the isolated review walkthrough, canonical simulation labels, generation guards, and exact owner-state restoration. Automated traversal is engineering evidence only and never owner practice.
- `app/guided/` owns guided-session evidence, strict hydration, independent persistence, the evidence-based review, and the narrow adapter that can hand an eligible beach attempt to the deck.
- `app/trip/` owns the versioned profile, local-calendar countdown, separate persistence, onboarding, and saved-trip summary.
- `app/lifecycle/` owns the Prepare/Trip contract, local mode persistence, and the two lifecycle surfaces.
- `app/pocket-deck/catalog.ts` is the immutable, reviewed 30-card catalog. Each card includes its English intent, Italian variants, likely reply, listening cues, search terms, local audio paths, and the exact spoken transcript.
- `app/pocket-deck/model.ts` owns the portable v4 state contract, v1–v3 migration, bounded multi-episode practice evidence, and deterministic pin/recent/handoff operations.
- `app/pocket-deck/practice.ts` derives factual, user-facing reminders from stored evidence; generated prose is never persisted.
- `app/pocket-deck/search.ts` owns local case-, punctuation-, apostrophe-, and diacritic-tolerant intent search.
- `app/pocket-deck/persistence.ts` owns the independent `thirty-days-to-italy-pocket-deck-v1` key and strict recovery. The key remains stable for compatibility while v1 pins/recents migrate to the v2 state shape.
- `app/pocket-deck/PocketDeckViews.tsx` owns Trip Mode search, categories, summaries, card details, audio, pinning, recents, and large-text display.
- `app/offline/` owns the verified worker handshake and truthful player-facing readiness state. It never reads or writes traveler state.
- `build/offline-assets.ts` owns deterministic asset selection, content-derived cache versions, and service-worker generation.
- `scripts/build-offline.ts` performs the vinext-compatible build handoff: discover hashed assets, generate the public and built-client worker/inventory copies, then verify exact parity.
- `scripts/generate-local-audio.ts` deterministically fills missing normal/careful encounter and Pocket Deck audio from the authored registries using the local Italian system voice; runtime playback never calls it. Optional turn/card IDs limit regeneration to selected authored entries, and `--force` replaces their existing pair.
- `scripts/offline-acceptance.ts` owns the production connected-to-disconnected browser acceptance.
- `public/audio/pocket-deck/` contains separate normal and careful files for every core card. Runtime playback uses no speech or network service.
- `app/persistence/reset.ts` clears the independent rehearsal, profile, lifecycle, guided-session, and Pocket Deck domains together.
- `tests/game-engine.test.ts` protects content integrity, teaching safety, fail-closed consequences, persistence, restart behavior, and the complete run.
- `tests/middle-season.test.ts` protects every Day 8–20 exit, the €9.20 canonical continuation, owned-ticket refunds, conditional callbacks, v4 world-state hydration, authored refreshers, and the eight new deck cards.
- `tests/day19-day21-truth.test.ts` protects Day 19 transaction truth and idempotent reloads, all Day 21 ferry-memory variants, factual-versus-incompatible callback routing, and the no-history return-question path.
- `tests/final-season.test.ts` protects the Day 22–30 route, completion durability and malformed-record rejection, every pending Day 30 terminal branch, exact issue acknowledgement, Day 29 exit/payment truth, and one-time Day 24 remedies.
- `tests/season-architecture.test.ts` protects module ownership, registry-derived catalogs, ID-only runtime state, generic fixture execution, Day 21 resolution, observational evidence, explicit attempt selection, and relationship migration.
- `tests/trip-profile.test.ts` protects defaults, calendar math, strict profile hydration, storage separation, and failure handling.
- `tests/lifecycle.test.ts` protects mode persistence, state isolation, the Prepare focus, and the no-teaching Trip contract.
- `tests/guided-session.test.ts` protects teach-and-resume evidence, support counts, result reconciliation, strict persistence, truthful review copy, and fresh attempts.
- `tests/pocket-deck.test.ts` protects catalog and audio integrity, English search, categories, pin/recent rules, strict persistence, state isolation, and the no-teaching Trip surface.
- `tests/offline-pwa.test.ts` protects manifest/icon metadata, exact audio inventory, cache-version determinism, atomic failure cleanup, scoped upgrade cleanup, repair support, same-origin behavior, and registration isolation.
- `tests/admin-fast-track.test.ts` protects checkpoint order, scene/mode inference, preview-only calendar math, and the no-wait Admin contract.

## Pocket Deck state and audio rules

- The static catalog and mutable state are separate. There is one reviewed 30-card catalog in source; local state contains pin IDs, recent IDs, and bounded evidence attached only to mapped reviewed cards.
- V1 hydration preserves valid pins and recents. V2/V3 evidence migrates into v4. V4 removes unknown, duplicate, inconsistent, or malformed evidence; caps recents at six and evidence per card at eight; and recovers to a usable deck after storage failure.
- A handoff is eligible only after a real completed outcome whose latest authoritative attempt contains observed moves. Stable attempt IDs make repeat application idempotent, while a later attempt adds a distinct evidence record.
- Handoffs store bounded facts such as outcome, observed moves, refresher method, explicit quantity/price evidence, and support counts. Target moves absent from accepted responses never enter the deck. Trip Mode derives the human reminder from those facts.
- Carrying evidence does not pin or open a card. **Open in Trip Mode** switches mode, opens the existing beach card, and only then records it in Recent.
- Opening, searching, pinning, or playing a card cannot change the trip profile, lifecycle mode, rehearsal scene, balance, inventory, evidence, refresher counts, or guided review.
- All card text, search data, and audio are bundled with the app. **Ready offline** appears only after the active worker confirms every required shell, font, icon, and audio response is present. **Offline** means the verified cache is being used without reaching the origin.
- Every audio pair speaks the card’s `primaryItalian`. `audioTranscript` is the auditable text contract. The careful file is a distinct, slower local asset rather than runtime playback-rate manipulation.
- Playing a new deck clip stops the previous clip. Leaving the card or Trip Mode stops deck audio.
- **Show this** is a fixed full-viewport presentation with its own vertical scrolling. It locks the underlying document, keeps Close reachable, traps keyboard focus, and restores the exact prior scroll/style state and trigger focus on exit.
- **Show this** exposes the Italian phrase without rehearsal metadata, reminders, or outcome details.
- Full reset clears deck pins, recents, and practice evidence, but the 30 core cards remain available because they are reviewed application content.

## Offline storage and updates

- The current production build derives and verifies 453 required resources: the root application shell, generated client chunks and manifests, local fonts, manifest and icons, 366 encounter audio files, and 60 Pocket Deck audio files. Counts are derived from the built output, turn registry, and deck catalog; the social preview is deliberately excluded.
- The cache version is the first 16 characters of a SHA-256 digest over the sorted required asset paths and bytes. Generated filenames are discovered from the vinext output; none are hardcoded.
- Installation is atomic. If any required response fails, the incomplete new cache is deleted and the previous working cache is retained.
- A connected reload can repair a missing resource. A successful new version activates without forcing a page reload, claims future requests, and removes only older caches beginning with `thirty-days-to-italy-offline-`.
- Traveler profile, game, lifecycle, guided-session, pins, Recent, and rehearsal evidence remain in their existing localStorage domains. They are never copied into Cache Storage and are not reset by a worker update.
- Browser installation UI varies. Chromium installability is exercised locally; Safari may expose **Add to Home Screen** instead of an install button. Service workers require HTTPS or a loopback origin such as `localhost` or `127.0.0.1`.

To clear only this prototype’s worker and offline files during development, use browser developer tools or run this in its console:

```js
await Promise.all((await navigator.serviceWorker.getRegistrations()).map((item) => item.unregister()));
await Promise.all((await caches.keys()).filter((key) => key.startsWith("thirty-days-to-italy-offline-")).map((key) => caches.delete(key)));
```

## Intentional prototype boundaries

- State is saved only in this browser with `localStorage`; there is no account or remote database.
- Typed language is interpreted by a bounded deterministic prototype layer, not an external model provider.
- Day 0 and Days 1–30 are playable. Only approved Day 30 outcomes complete the season; early exit and unresolved keys remain truthful non-completion outcomes.
- NPC audio is fixed and pre-produced; there is no runtime generation.
- Pocket Deck cards remain the reviewed core set. Personalization is evidence-backed strengthening only; no new card is generated at runtime.
- Multi-device sync, reminders, provider-outage behavior, and production authentication are not implemented.
- The app is ready for owner-only first-user use, not public launch.
- Offline readiness applies only after one connected production load has completed successfully on that device and origin.
