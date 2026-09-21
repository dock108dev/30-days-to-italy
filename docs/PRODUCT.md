# Product behavior

## Current beta target — September 21, 2026

The [Desktop beta path](/Users/michaelfuscoletti/Desktop/italy_next_steps.md) requires adequate teaching throughout Day 0–30, automatic targeted-review suggestions and varied practice. Past dates stay unlocked; future dates may stay locked for a free-version test. Retain the valid Day 30 Trip Mode/Pocket Deck gate. Computer-to-phone progress continuity is requested after beta, not implemented or required now. No payment/account/premium-tier system is implied.

These are requirements, not current feature claims. Existing teaching preparation covers Days 0–1; new full-season teaching/review/variation work needs implementation assessment and qualification. The current product behavior below describes the existing application. The prior owner rejection and D0-01 remain unresolved by owner acceptance.

30 Days to Italy helps one traveler rehearse practical situations before a 7–10 day Italian coastal trip and retrieve prepared language during the trip. It is a private, typed, device-local product—not a language course, itinerary manager, booking tool, live travel-information service, or unrestricted translator.

## Core flow

1. The traveler enters a departure date and a small trip profile.
2. Prepare Mode schedules 31 sessions from Day 0 through Day 30. Unlocked missed sessions remain available without streak penalties.
3. Each session presents authored Italian audio, accepts a bounded typed response, and applies deterministic consequences. Day 4 also records a guided beach-rehearsal path and review.
4. English fallback can pause the scene for a contextual refresher and then return to the same conversation.
5. Eligible observed practice can strengthen a reviewed Pocket Deck card. Authored targets or successful outcomes alone never count as evidence.
6. Trip Mode provides searchable, pinnable, offline cards with normal and careful local audio. It does not teach, score, or change rehearsal state.

Trip Mode unlocks only after a valid Day 30 completion. Prepare Mode remains available for replay, and historical valid season completion is retained when a later replay exits or fails to qualify.

Leaving, short answers, mixed language, replay, slower audio, and transcript use are valid. The app must report factual outcomes and must not invent purchases, attendance, commitments, refunds, or successful communication.

## State and privacy

Trip details and progress live in separate `localStorage` records in the current browser. Clearing site data or opening another browser or device starts fresh. There is no remote database, account, sync, analytics, microphone input, or provider integration.

Malformed saved state recovers fail-closed. Supported historical game schemas are migrated because an owner browser may still hold them. Existing storage keys are intentionally stable.

## Admin review

Admin starts an isolated synthetic walkthrough generated from the same 31-session registry. It snapshots and namespaces owner state, labels canonical simulation separately from normal play, and restores the owner snapshot on exit. Calendar dates in review are previews only.

Admin is a local inspection tool, not an authorization boundary. The hosted app must remain owner-only unless shared access receives a separate architecture, security, and privacy decision.

## Offline contract

Offline use becomes available only after a connected production visit reaches **Ready offline** on that browser and origin. The build-generated cache contains the app shell, fonts, icons, and reviewed audio inventory. If verification or repair fails, the app reports **Offline files unavailable** and must not claim readiness.

## Day 0–1 teaching and conversation

Both days open with situation → listening and chunk meanings → explained response pattern and a different-situation written example → explicit handoff. The reflection requests no input. **Start conversation** opens the live encounter; **Play the line** or **Read the line** makes an empty composer available. Examples are never inserted or submitted. New-material turns show the complete brief, including the prior response feedback, before **Continue conversation**. Repeated partial replies do not repeat a traversed brief.

**Review preparation** opens a nonmodal detour for the pending turn. Every page offers **Return to my response** and preserves the draft and live phase in memory, existing help, and keys. Overview navigation resumes the same day. Reload preserves the preparation page and turn but discards transient drafts and restores live `awaiting_line`. Explicit replay begins a fresh preparation attempt while retaining recorded results and historical season completion. Day 2 onward retains its existing flow.

Result details show **Preparation activity** separately from **Progressive help used**: traversed pages/examples and normal/careful playback attempts. Activity does not establish comprehension. Missing historical information says it was not recorded; historical versions are identified without inferring current titles. Completed-result preparation review and audio cannot change that frozen summary.

T1–T5 preparation and verification were completed for the retained Day 0–1 repair candidate; T6 owner review did not run. The prior owner verdict remains REVISE DEMO and D0-01 remains OPEN. The [tracker](/Users/michaelfuscoletti/Desktop/italy_next_steps.md) now owns the expanded beta path and current candidate reconciliation; prior checks do not qualify new review/variation features or newer dependencies.
