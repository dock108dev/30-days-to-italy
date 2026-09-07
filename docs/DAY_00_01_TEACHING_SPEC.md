# Day 0–1 teaching content and flow

T1 specification, 2026-09-07. **Design complete; T2 comprehension implemented. T3 not started.**

This document specifies T2 and T3. Sections 2–6 retain the complete target behavior; the implementation status below distinguishes what exists now.

**T2 implementation status (2026-09-07):** episode-owned complete content, situation/listening screens, later-turn comprehension, separate audio, additive preparation normalization, guarded routing, same-day resume and responsive focus behavior are implemented. Forward controls stop disabled at listening/brief pages. No segment/example traversal is recorded. Saved future pattern/handoff pages remain gated. T3 owns pattern/example display, explicit live handoff, text-only live readiness, review detours, return-mode persistence, final traversal/duplicate guards, result snapshots and completion summaries. No abbreviated live sequence is treated as the complete repair. Focused evidence is recorded in the [T2 engineering handoff](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/t2-preparation-20260907/handoff.md).

The remaining target behavior is proposed unless explicitly labeled **Current**. It is not runtime, qualification, learning-assessment, or owner-acceptance evidence. Overall status remains **REVISE DEMO — NOT READY FOR ANOTHER DEMO**; D0-01 remains OPEN. The [active tracker](/Users/michaelfuscoletti/Desktop/italy_next_steps.md) owns work status.

## Baseline and requirement

Inspected branch `main`, HEAD `b1edc23eb6c081002604621f7081b2bd8be3023a`, tree `9400261e00dab41e4ac0f1beecccb0d265bf7613`. The repository was clean before T1 documentation edits. No applicable AGENTS.md exists in the repository or checked ancestor directories. Source matches the rejected candidate; no behavioral delta is attributed to a new candidate. Hosted synchronization was not checked in T1.

The [September 7 review](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/candidate-day01-repair-20260905-b1edc23/owner-review.md) confirms that the first Day 0 response request preceded sufficient teaching. Onboarding was completed by owner report; Day 0 was incomplete, and Day 1 and its completion review were not started. Day 1 is intended repair scope, not another observed defect. The [August requirements](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/owner-review-20260825/pm-feedback-and-slices.md) remain useful response/help/feedback contracts, not the active slice plan.

Decision: teach the situation, meaningful chunks, and a reusable response structure in the ordinary journey before exposing the response composer. Use an explained worked example, with no input, score, or correctness gate. Give newly needed vocabulary a brief introduction before later nonterminal turns. Reading and playback are preparation activity, never proof of comprehension.

## 1. Source-grounded behavior and ownership

All links below point to inspected repository files. Symbols and turn IDs locate contracts without relying on line numbers that implementation will move.

| Concern | Current source and verified behavior | Proposed ownership/change |
| --- | --- | --- |
| Onboarding | [TripProfileViews.tsx](../web/app/trip/TripProfileViews.tsx) owns `TripSetup`; [PrototypeApp.tsx](../web/app/prototype/PrototypeApp.tsx) renders it when `tripProfile` is absent. `saveTripDetails` persists the profile and enables the normal app. Initial game is Day 0. | After hydration/profile availability and within Prepare Mode, derive the preparation gate from the registered episode before rendering live response UI. No separate onboarding lesson store. |
| Episode entry | `selectSeasonEpisode` currently delegates ordinary selection to `seedEpisode`; `seedEpisodeState` resets to the episode's authored seed. `nextEpisodeState` advances using registry order. | Same-current-day selection must resume, not reseed. Selecting another day retains the existing explicit restart/seed semantics, clearly labeled. Preparation follows every new Day 0–1 attempt. |
| Episode content | [day-00.ts](../web/app/season/episodes/day-00.ts), [day-01.ts](../web/app/season/episodes/day-01.ts), [types.ts](../web/app/season/types.ts) `EpisodeDefinition` and `authoredTurn`; [registry.ts](../web/app/season/registry.ts) derives catalogs. | Add optional episode-owned preparation data to `EpisodeDefinition`, only populated for these two days. Reference owned turn IDs; never copy dialogue, media paths, response rules, or outcomes into a second catalog. |
| Live presentation | [PrototypeViews.tsx](../web/app/prototype/PrototypeViews.tsx) `SceneIntroduction`, `EncounterStage`, `ResponseComposer`, `WorldPanel`; [usePrototypePresentation.ts](../web/app/prototype/usePrototypePresentation.ts) derives phases from episode/turn/status. Live starts `awaiting_line`; playing audio makes it `ready_to_respond`; playback failure exposes transcript and permits response. | Preparation is an outer gate, not a pretend encounter turn or another outcome. Gate composer, live playback, and response focus until preparation handoff. Retain existing live phases underneath. |
| Audio | `authoredTurn` derives `/audio/normal/<turnId>.m4a` and `/audio/careful/<turnId>.m4a`; `playAudio` in `PrototypeApp` also records support and sets live readiness. | Reuse registry media through a separate preparation playback handler. Do not call the live handler from preparation. No new audio needed for this design. |
| Response transaction | [engine.ts](../web/app/game/engine.ts) `submitEpisodeResponse` calls evaluation then `finishPendingOutcome` in the same transaction. Episode evaluators own mutations; `observeResponse` owns evidence. | Keep this boundary unchanged. Preparation actions cannot call response submission, evaluators, observed-move extraction, result resolution, or deck handoff. |
| Fallback/mixed language | [model.ts](../web/app/game/model.ts) `detectTeachingPhrase` runs before episode evaluation; [response-contracts.test.ts](../web/tests/response-contracts.test.ts) contains Day 0–1 English-guess and mixed-noun matrices. | Keep recognized Italian-framed mixed nouns; do not introduce general translation or relax evaluator rules for taught text. |
| Progressive assistance | `advanceProgressiveHelp` in engine; `ProgressiveHelpPanel` and `WorldPanel` in views; `useProgressiveHelp`/toggle coordination in app. Per-turn levels are sequential, 1–6, and persisted. | Keep normal replay → careful replay → Italian cues → NPC meaning → incomplete frame → complete model. Preparation does not advance this ladder. |
| Feedback | Episode-owned `day00Teaching`/`day01Teaching`; `TeachingFeedbackResult` and `OutcomeCard` in views. Engine stores the chosen branch's feedback. English fallback opens progressive help without advancing it. | Retain “We understood,” “More natural,” optional “Try next.” Show previous response feedback above later-turn preparation; do not hide it or replace it with lesson praise. |
| Persistence | [model.ts](../web/app/game/model.ts) `GameState` schema 6; [persistence.ts](../web/app/game/persistence.ts) `hydrateGameState`, `normalizeEpisodeResults`, `normalizeProgressiveHelp`; [useApplicationSession.ts](../web/app/prototype/useApplicationSession.ts) owns load/save guards. | Add optional, normalized preparation activity inside game state and optional result snapshot. Keep the stable game key and current schema; missing fields default safely as detailed below. |
| Isolation | [session.ts](../web/app/persistence/session.ts) namespaces the five domain keys and snapshots owner data. [reset.ts](../web/app/persistence/reset.ts) clears domains. | No sixth storage domain. Existing game isolation carries new fields. Verify clone/seed paths and generation guards preserve isolation. |
| Completion/replay | Engine `resolveOutcome` records resolved exits as well as successful exchanges in `completed`; results retain eight attempts. `restartEpisodeState` seeds a fresh world, preserving support/results/phrase practice/season completion. | Preparation is not a completed day. Preserve explicit replay semantics, including reseeding effects; distinguish a preparation revisit from replay. Snapshot preparation once with the actual result. |
| Review/deck | `OutcomeCard`, `buildObservedEpisodeResult`, [pocket-deck-handoff.ts](../web/app/season/pocket-deck-handoff.ts). Review presents practical result, useful phrasing, deck effect, response/evidence/help details, and next action. | Add a separate preparation-activity detail, never feed it into observed moves or deck eligibility. Existing resolved outcome and deck behavior remain authoritative. |

### Response branches that the design must respect

**Day 0:** `e01_01_name` recognizes Fuscoletti, including a terse surname; it is a fixed fictional booking, not the trip profile's arbitrary identity. Missing surname moves to `e01_02_clarify_name`, including a partial reservation intent. This clarification transition is not check-in success: no key is issued until the name is recognized. Identity moves to `e01_03_key` and issues the hotel key. There, an Italian room fact, floor fact, or explicit understanding can resolve `E1-O3`; asking about `colazione` opens `e01_04_breakfast`. Exit takes precedence at the key turn. At breakfast, `dieci` or explicit understanding resolves `E1-O1`, while exit resolves `E1-O3` with breakfast unconfirmed. Early exit is `E1-O4`, with no key. `e01_06_boundary` is terminal and requires no response.

**Day 1:** `d01_01_arrival` needs recognized identity (Michael or Fuscoletti) plus a recognized Italian key request. Identity-only and request-only feedback remain partial on that turn. Passing issues the apartment key and enters `d01_02_door`. Both `porta verde` and `primo piano`, or an explicit understanding phrase, resolve `D01-O1`; one fact alone stays partial. Early exit is `D01-O2`; exit after receiving the key is `D01-O3`, with directions unconfirmed. `d01_03_close` is terminal.

Do not overstate validation: “Ho capito” is currently accepted without repeating facts, and feedback explicitly says facts were not repeated. Do not remove that brief option or claim it demonstrates fact recall. “Grazie” alone and English keyword bags do not satisfy these turns. `Ho una reservation a nome Fuscoletti` is an existing supported mixed-noun example; this is not permission for every English replacement. Day 0's optional `e01_05_optional` exists but no current ordinary evaluator transition leads to it. Keep it unreachable; provide bounded preparation below only if a retained active save reaches that owned turn. Do not add a sociability branch.

## 2. Teaching copy and audio

The following is actual proposed copy. Headings, explanations, and Italian examples are separate authored fields, not one long English transcript. A chunk is displayed next to its short explanation. Visible Italian is marked `lang="it"`. Full Italian NPC text comes from the referenced turn, never duplicated in preparation content. Each listening page includes that Italian transcript by default and the listed cues. There is no full English translation by default.

For every audio turn ID below, both matching files were found under [normal audio](../web/public/audio/normal) and [careful audio](../web/public/audio/careful), nonempty. File presence is T1 evidence, not listening-quality evidence. Worked examples are explicitly text-only, labeled “Written example”; no clip is implied or missing. T2 must check actual playback using these assets. No generation or asset edits are authorized in T1.

### Day 0 entry — identify the booking

**Situation heading:** “Day 0 · A room for the night”

**Situation copy:** “You have arrived at the hotel. Elena needs the name on your reservation before she can give you the key. Learn what she is asking and how to give the booking name.”

**Context note:** “For this rehearsal, the reservation surname is Fuscoletti.” This supplies a necessary scenario fact, not a suggested full answer.

**Listening heading:** “Listen for the reservation and the name”

**Purpose:** “You are listening for two things: whether you have a reservation, and whose name it is under.”

| Italian chunk | Meaning and purpose shown beside it |
| --- | --- |
| Buonasera | Good evening. A greeting; you do not need a long introduction. |
| Ha una prenotazione? | Do you have a reservation? Here, ha asks whether you have something; prenotazione is the reservation. |
| A che nome? | Under what name? Elena needs the booking name. |

**Listening cue:** “Listen for prenotazione, then a che nome. The second question tells you which detail to give.”

**Audio:** `e01_01_name` — “Buonasera. Ha una prenotazione? A che nome?” Normal and careful, with the exact Italian transcript visible.

**Pattern heading:** “Say what you have, then name it”

**Pattern:** “Ho una prenotazione a nome [surname].”

**Parts:** “Ho means I have. Una prenotazione says what you have: a reservation. A nome links it to the surname on the booking. Replace the surname; keep the useful structure.”

**Written example:** “A different booking is under Rossi: Ho una prenotazione a nome Rossi.”

**Example explanation:** “Rossi fills the name slot. The sentence tells the clerk both why you are there and which booking to find.”

**Supported reflection:** “For your rehearsal, keep the reservation structure and use the surname on your booking. A brief answer is enough.” No input is requested or stored.

**Handoff copy:** “Now check in with Elena. Listen or read, then give the booking name in your own response. Optional help is available throughout the exchange.”

### Day 0 clarification — only on entry to e01_02_clarify_name

**Heading:** “When the clerk needs your surname again”

**Copy:** “Elena has not matched the name yet. You do not need to restart your introduction.”

**Chunks:** “Mi scusi — excuse me; a polite lead-in.” “Può ripetere — can you repeat; she wants the information again.” “Il cognome — the surname; repeat that part.”

**Cue:** “Listen for ripetere and cognome. This is a request to repeat your surname.”

**Audio:** `e01_02_clarify_name` — “Mi scusi, può ripetere il cognome?”

**Pattern/example:** “Il cognome è [surname]. Il cognome è Rossi. Il cognome names the detail; è means is; the last part supplies it.”

**Transition:** “Return to Elena and repeat the surname on this booking.” Display previous partial/failed feedback separately above this preparation; preparation does not change its status.

### Day 0 directions — on entry to e01_03_key

**Heading:** “Catch the room and floor”

**Copy:** “Elena has matched the booking and issued the key. Now listen for where to go. You can confirm briefly and finish the exchange.”

**Chunks:** “Camera — room; the number after it identifies your room.” “Dodici — twelve.” “Al primo piano — on the first floor; piano means floor here, and primo means first.” “Ecco la chiave — here is the key; chiave is key.”

**Cue:** “Listen for camera followed by the number, then piano with the floor. Separate the two location details.”

**Audio:** `e01_03_key` — “Perfetto. Camera dodici, al primo piano. Ecco la chiave.”

**Pattern/example:** “Ho capito: [detail]. Ho capito means I understood; adding a detail says what you understood. Written example, a different room: Ho capito: camera otto. Otto means eight; it belongs to this example, not your room.”

**Optional purpose copy:** “To ask when breakfast ends, use A che ora finisce la colazione? A che ora asks at what time; finisce means ends; la colazione is breakfast. Or finish with Grazie, buonanotte — thank you, good night. No extra conversation is needed.” This teaches a question, not a required response or evidence of recall.

**Transition:** “Listen for your room information. Then confirm what you understood, ask about breakfast, or end the exchange.”

### Day 0 breakfast — only on entry to e01_04_breakfast

**Heading:** “Listen for when breakfast ends”

**Copy:** “You asked about breakfast. Listen for the ending time.”

**Chunks:** “La colazione — breakfast.” “Finisce — ends.” “Alle dieci — at ten; alle introduces the time.” “Ha bisogno di altro? — do you need anything else? You can end the conversation.”

**Cue:** “Listen after finisce for alle and the time. This is the end time, not the start.”

**Audio:** `e01_04_breakfast` — “La colazione finisce alle dieci. Ha bisogno di altro?”

**Pattern/example:** “La colazione finisce alle [time]. Written example, a different schedule: La colazione finisce alle nove. Nove means nine; replace that time with the one you hear.”

**Transition:** “Return to Elena. Confirm the information, or say good night. You already have the key.”

### Day 0 retained optional turn — compatibility only

**Heading:** “A brief personal question”

**Copy:** “Prima volta means first time. È la prima volta a Salerno? asks whether this is your first visit. Sì means yes; no means no. You can answer briefly or end with Grazie, buonanotte.”

**Cue/audio:** “Listen for prima volta.” `e01_05_optional` — “È la prima volta a Salerno?”

**Pattern/example:** “Sì, è la mia prima volta a [place]. Written example: Sì, è la mia prima volta a Roma. The place changes; prima volta still means first time.”

**Transition:** “Answer only as much as you want, or end the conversation.” Do not schedule this preparation unless that existing turn is active.

### Day 1 entry — identify yourself and request the key

**Situation heading:** “Day 1 · Collect the apartment key”

**Situation copy:** “Raffaele is ready for a short key handoff. Learn how to recognize his identity question and explain why you are there.”

**Context note:** “For this rehearsal, you are Michael Fuscoletti, collecting the apartment key.”

**Listening heading:** “Hear the person and the purpose”

**Purpose:** “Raffaele asks who you are and whether you are there for the key. Your reply needs both pieces.”

| Italian chunk | Meaning and purpose shown beside it |
| --- | --- |
| Buonasera | Good evening. A short greeting. |
| Lei è Michael? | Are you Michael? Lei is a polite you; è asks who you are here. |
| È qui per…? | Are you here for…? Qui means here; per introduces the purpose. |
| La chiave | The key. Listen for what you are collecting. |

**Cue:** “Listen for the name after Lei è, then per la chiave. There are two questions, not just a greeting.”

**Audio:** `d01_01_arrival` — “Buonasera. Lei è Michael? È qui per la chiave?”

**Pattern heading:** “Give your name and your purpose”

**Pattern:** “Sono [name]. Sono qui per [purpose].”

**Parts:** “Sono means I am. Add your name to identify yourself. Sono qui means I am here. Per connects that to your purpose. For collecting the key, the purpose chunk is la chiave.”

**Written example:** “A different traveler is here for a reservation: Sono Anna. Sono qui per la prenotazione.”

**Example explanation:** “Anna fills the identity slot. La prenotazione fills the purpose slot. For the key handoff, use the rehearsal name and the thing you are collecting.”

**Supported reflection:** “Think of the two pieces you want Raffaele to understand: who you are, and why you are here. You can keep both sentences short.”

**Handoff copy:** “Now meet Raffaele. Listen or read, then identify yourself and ask for the key. Use optional help whenever you want.”

### Day 1 directions — on entry to d01_02_door

**Heading:** “Find the door, then the floor”

**Copy:** “Raffaele has handed you the key. Now listen for the entrance and where to go next.”

**Chunks:** “Ecco la chiave — here is the key.” “La porta verde — the green door; porta is door and verde is green.” “Poi — then; it puts the directions in order.” “Il primo piano — the first floor.” “È chiaro? — is that clear?”

**Cue:** “Listen for the description after porta. Then poi separates the door from the floor.”

**Audio:** `d01_02_door` — “Ecco la chiave. La porta verde, poi il primo piano. È chiaro?”

**Pattern/example:** “Ho capito: [door detail], poi [floor detail]. Ho capito says you understood. Repeating the two details checks the route. Written example, different directions: Ho capito: la porta blu, poi il secondo piano. Blu means blue; secondo means second. These are example details, not your entrance.”

**Transition:** “Return to Raffaele. Confirm the directions you heard, say they are clear, or end the exchange. You can keep it brief.”

### Terminal lines

`e01_06_boundary` (“Certo. Buonanotte e buon riposo.”) and `d01_03_close` (“Perfetto. Se serve qualcosa, mi scriva. A dopo.”) are existing closing lines, with normal/careful files present. Neither requests a response, so neither gets mandatory preparation. Keep current result/media behavior; do not replay these as teaching or delay committed results until media finishes.

## 3. Inspectable sequence and interaction rules

### Shared layout and controls

Every preparation page uses one reading column, max approximately 42rem, with day/segment context, one heading, the relevant copy above, then navigation. Mobile uses the same DOM order at full available width with 16px side padding. At desktop and 390px portrait/844px landscape, paragraphs wrap and controls stack as needed; no side-by-side answer catalog, fixed-height lesson, horizontal scrolling, or sticky footer covering content. Italian chunks are a semantic list with adjacent explanations, not a wide table in the UI. Use at least 44px touch targets and visible keyboard focus. No timer, required duration, XP, microphone, or automatic playback.

Navigation focuses the new heading (`tabIndex=-1`) and brings it into view. Do not focus or mount the encounter textarea underneath preparation. Playback keeps focus on its button; status changes use a polite live region. Each listening page has **Play normal**, **Play careful**, **Stop audio** (enabled only while playing). Playback does not advance a page. Starting another clip stops the old clip; leaving a page stops playback. The Italian transcript is always readable here. On failure show “Audio could not play. You can read the Italian and continue.” Allow retry through either play button and continue through text. No playback is required to proceed.

Every preparation page also has **Return to season overview**. It saves position and leaves the encounter unresolved, without submitting an exit. Escape does not dismiss a mandatory preparation page into the composer. Modal overview/help Escape and focus restoration retain their current contracts. Browser reload restores the preparation page, not focus in a hidden textarea.

### Full Day 0 sequence

| Step | Visible content | Controls/action that advances | Saved change and focus |
| --- | --- | --- | --- |
| D0-S | Situation heading/copy and booking context note above. Label “Before the conversation”. Entry after successful setup, eligible day selection, or explicit replay. | **Prepare for check-in** → D0-L. Overview remains available. | Create/reconcile entry preparation; save step `situation`. On advance save `listen`; heading focus. No game transition. |
| D0-L | “Listen for the reservation and the name”, purpose, three chunks, cue, registry Italian transcript and audio controls. | **Build a response** → D0-P; **Back** → D0-S. | Save step only; playback attempts recorded separately. Heading focus on navigation. |
| D0-P | Pattern heading, structure, explained parts, “Written example”, Rossi example and supported reflection. | **Continue to check-in** → D0-H; **Back** → D0-L. | Save `handoff`; mark pattern/example page traversed, not mastered. Heading focus. |
| D0-H | Handoff copy; “This is now the conversation. The example has not been sent.” | **Start conversation** → live `e01_01_name`; **Back** → D0-P. | Mark entry segment traversed once; save mode `encounter`. Focus live encounter heading. No response/effect. |
| D0-E | Existing Italian audio/response flow and optional assistance. No worked example remains beside the composer. | Existing **Play the line**, transcript/help/reply controls; additional **Read the line** permits text-only readiness. **Review preparation** reopens entry at D0-S with a return control. | Existing playback/read readiness focuses composer only after explicit live action. Review detour preserves pending turn, draft in memory, and support. |
| D0-C | On first arrival at clarification, directions, breakfast, or retained optional turn: previous feedback first, then that segment's complete copy, audio and written example from section 2. Label “Before your next reply”. | **Continue conversation** → this pending turn; **Back to explanation** is unnecessary on this one-page segment. **Review preparation** remains possible from live. | Acknowledge this segment once; no evaluator call. Focus live heading. Repeated failed submissions on the same turn do not reopen the page. |
| D0-R | Existing resolved practical-result review, feedback, deck result and help details, plus preparation detail below. | **Continue to Day 1** when eligible → D1-S; **Replay this day** → new D0-S; **Review the season** → overview. | Next/replay use existing explicit game transitions; preparation alone never creates this review. Focus review title upon resolution. |

### Full Day 1 sequence

| Step | Visible content | Controls/action that advances | Saved change and focus |
| --- | --- | --- | --- |
| D1-S | “Day 1 · Collect the apartment key”, situation and Michael Fuscoletti context. Label “Before the conversation”. | **Prepare for the key handoff** → D1-L. | Entry after eligible Day 0 continuation, day selection, or replay; save `situation` then `listen`. Heading focus. |
| D1-L | “Hear the person and the purpose”, four chunks, cue, `d01_01_arrival` transcript/audio. | **Build a response** → D1-P; **Back** → D1-S. | Save step; separate audio attempts. Heading focus. |
| D1-P | “Give your name and your purpose”, two-slot pattern, parts, Anna/reservation example and reflection. | **Continue to the handoff** → D1-H; **Back** → D1-L. | Save `handoff`; record page traversal without assessment. Heading focus. |
| D1-H | Handoff copy; “This is now the conversation. The example has not been sent.” | **Start conversation** → live `d01_01_arrival`; **Back** → D1-P. | Mark entry traversed; save mode `encounter`. Focus live heading. |
| D1-E | Existing arrival exchange. Partial name/request feedback stays with this turn. **Review preparation** is available. | Same live controls as D0-E. A meaningful accepted response enters directions preparation. | No preparation repeat on a partial retry. Only accepted submission issues key. |
| D1-C | “Find the door, then the floor”, all section 2 directions copy, prior accepted feedback, audio, pattern/example. | **Continue conversation** → live `d01_02_door`. | Mark this segment traversed. Focus live heading. No additional key or completion effects. |
| D1-R | Existing Day 1 result review with separate preparation detail. | Existing next-day eligibility, **Replay this day**, **Review the season**. | No Day 2 preparation added. Owner demo still ends at Day 1 review under T6. |

The **Read the line** action is a deliberate Day 0–1 accessibility extension: reveal Italian and set live readiness without requiring an audio attempt. Record its first reveal through the existing in-turn transcript counter, once per visible reveal lifecycle; preparation transcript reading does not count. Careful in-turn playback remains level 2 of progressive help, normal playback remains directly available. Rehearsal support retains its actual counting behavior; no claim of unique listens.

**Review preparation** opens a nonmodal preparation detour for the current turn's segment (entry sequence for first turn, one-page segment otherwise). It includes **Return to my response** at every page, restores the prior live phase and in-memory draft, and returns focus to the invoking control (or composer if that control no longer exists). This detour cannot reseed an episode. For first-time mandatory preparation, there is no “skip to response”; the traveler may navigate at their own pace or leave through the overview.

## 4. Learning-to-response bridge

The Italian chunks teach what the other person is asking. The pattern explains how words express the traveler's intent. The written example demonstrates slot substitution with a different name, object, room, or floor. The context note supplies the actual fictional task fact separately. The live composer starts empty; there is no copy/insert-example button and no hidden prefilled answer. The traveler constructs the response; the existing evaluator determines only its bounded communicative result.

No supported practice input is added. The reflection is an invitation to think, not a question requiring an answer. On the pattern page, the **Continue** action records that the written example page was traversed; merely mounting the page must not record an example as viewed. Additional one-page turn briefs record their example traversal on **Continue conversation**. These are navigation records only. **Continue** means the page was traversed, not that learning was proven. This satisfies the worked-example option without a second matcher, scoring system, freeform scratchpad persistence, or accidental submission path.

A complete model for the pending turn remains available through the owner's explicit level-6 help choice. It is separate from a different-situation written example. Existing feedback may supply a branch-appropriate natural phrase after submission. Neither disclosure nor later submission of a model establishes unaided understanding. Preserve existing accepted-response evidence; do not invent a copying detector or change deck policy in this slice.

The older default “no English meaning before first attempt” is deliberately narrowed: concise chunk meanings and response construction are now visible in preparation to resolve D0-01. The live help panel still begins collapsed and never automatically advances to meaning or answer reveal. Teaching useful pieces before rehearsal is required; hiding all teaching to preserve an old default would repeat the rejected entry experience.

## 5. Preparation state, persistence, and compatibility

### Data contract (new fields proposed, not existing interfaces)

Extend `EpisodeDefinition` with optional `preparation`: a content version, an entry segment, and a map from owned nonterminal turn IDs to additional segments. Each segment owns heading, purpose, chunk/meaning pairs, cue, pattern/parts, written example/explanation, reflection and transition copy. Its audio reference is an owned turn ID. Labels shared by every page belong in presentation. Validate references through the existing registry/authoring tests; do not add engine day-ID switches or a parallel manifest.

Extend `GameState` with optional `preparation` activity for the **current attempt only**: episode ID, preparation content version, current segment ID, page (`situation`, `listen`, `pattern`, `handoff`, or `turn-brief`), mode (`preparing`, `encounter`, or `reviewing`), unique traversed segment IDs, unique visited pattern/example IDs, and per-segment normal/careful playback-attempt counts. A review detour also records its return mode/page; live phase/draft remain transient. Counters are bounded nonnegative integers using existing normalization conventions. No response text, proficiency, score, elapsed lesson time, or practice-success field is added.

Extend `EpisodeResult` with an optional immutable `preparation` summary: content version, traversed segment IDs, visited pattern/example IDs, and per-segment playback-attempt counts. Snapshot it in `buildObservedEpisodeResult` for the actual resolved attempt. Do not retain a current cursor in the result. Continue the existing eight-result bound and exactly-once attempt identity. No snapshot is written by a preparation button.

Use the existing game storage key `un-mese-prototype-v1` and `useApplicationSession` save/session guards. This is additive optional schema-6 data: `hydrateGameState` currently normalizes fields individually, so extend its parser and result normalizer instead of renaming the key or introducing a migration runner. Existing schema 1–5 migration paths remain. Add bounded normalization for the new fields; malformed preparation resets preparation only, never otherwise valid world/results. Unknown episode/turn/segment references cannot unlock the composer. Content-version mismatch resets active preparation to the required segment; historical summaries retain their recorded version and are labeled as historical rather than inferred against new content.

### Lifecycle rules

| Boundary | Required behavior |
| --- | --- |
| First fresh entry | Initialize entry preparation for an active Day 0/1; show situation before live line or response. Profile save does not teach or complete anything by itself. Day locks continue to come from schedule. |
| Next/Back | Set an exact target page, guarded by expected current segment/page and session generation. Duplicate clicks on the old page cannot skip two steps. Going back does not erase visited history or create another completion. |
| Reload while preparing | Restore page and counters; audio stopped; focus heading. No typed practice exists to restore. A missing/invalid cursor starts the relevant required preparation safely. |
| Reload in encounter | Restore existing game turn/result/help from game hydration. If its preparation is traversed, return to existing `awaiting_line`; do not replay audio automatically. Unsaved response draft remains transient and is not restored, matching the existing model. |
| Reload in review detour | Reopen the saved detour page. **Return to my response** returns to the pending turn at `awaiting_line`; the transient draft is gone. No turn, help level, or world effect is lost. |
| Leave to overview, close tab, return to same day | Preserve current preparation and game. Closing overview or selecting the current day resumes rather than invoking `seedEpisodeState`. Keep in-memory draft on an overview detour; no new cross-tab draft promise. |
| Choose a different day | Current app stores one active encounter, not multiple suspended games. Preserve that model. For affected Day 0–1 navigation label a different-day choice **Start Day N** or **Replay Day N**, with copy “Starting another day replaces your current unfinished conversation. Recorded results stay saved.” Explicit selection uses existing seed behavior and resets current preparation. Returning later begins preparation again; do not promise suspended-turn restoration. |
| Replay this day | Explicit existing replay reseeds the encounter/world as it does today; resets preparation cursor, traversed IDs and counts for the new attempt, and clears progressive help as current `resetInteraction` does. Retain existing result history, cumulative scene support, phrase practice and season-completion behavior. Preparation reset is not itself the replay transaction. |
| Revisit current completed day | Show existing result review directly, with its frozen preparation summary if present. Never force preparation in front of an already resolved review or recalculate its result. A separate **Review preparation** detour may show teaching without modifying the result; **Return to review** restores review heading. Playback in this completed detour is transient and excluded from that attempt's summary. |
| Select a different completed day | Keep explicit replay selection semantics; do not silently present it as resuming the old attempt. Existing stored results remain retained. No historical-world reconstruction or new review archive is required. |
| Legacy active save with no preparation | Preserve world, pending turn, previous response, and support. At entry turn, show full entry preparation. At a later nonterminal turn, show that turn's brief preparation; do not roll back a key handoff or require first-turn practice again. At terminal/pending outcome, existing `finishPendingOutcome` wins; do not interpose preparation. |
| Legacy resolved save | Keep its review immediately accessible. Missing summary means “Preparation activity was not recorded for this attempt,” not “skipped” or “completed.” No retroactive history generation. |
| Repeated turn/retry | A traversed later-turn segment does not interrupt retries. An explicit review is always available and records no additional unique traversal; playback attempts may increment. Stale media events cannot change a new page/turn/session. |
| Saving failure | Use existing operational warning behavior; allow current in-memory navigation but never claim progress was saved. Reload may recover last saved position. No broad storage redesign. |
| Admin/reset | The namespaced game record contains preparation. Synthetic canonical execution remains engine-only and is not evidence of having read teaching. Preserve exact owner restoration. Existing explicit app reset clears preparation with game; T1 performs no reset. |

### No-effects and support-history invariant

A preparation transition may update only preparation activity and transient presentation. It must not independently change money, time, inventory, reservations, commitments, relationships, keys, world facts, encounter completion, season progress, Pocket Deck outcomes, observed moves, verified facts, response history, last response, teaching feedback, or episode attempts. If the preceding accepted response already issued a key, the following preparation reports that fact without issuing it again.

A live-to-preparation review detour saves the pending turn identity and validates it again on return; if submission elsewhere has already changed the turn, derive the gate for the current authoritative turn rather than restoring an old one. The composer submission handler must also check the derived preparation gate, not just rely on the form being hidden.

Preparation playback counts **attempted playback**, including failed starts, labeled that way; completion/end events never increment again. There is no count for passive transcript visibility. Do not call `recordSupport`, `advanceProgressiveHelp`, `recordPhrasePractice`, or `recordEpisodeRefresher` from preparation. Live help continues to record its own usage, including chosen normal/careful levels and transcript reveals. Current scene support is cumulative across replay; current progressive-help maps reset on new interaction. Do not relabel either as a preparation total or silently change its scope.

In the existing review's **Response and evidence** details, add **Preparation activity** with factual copy: “Preparation pages viewed: [authored segment titles]. Written examples viewed: [count]. Preparation audio attempts: normal [count], careful [count]. This records preparation activity, not a comprehension result.” If only a subset was traversed, list only that subset. Zero counts display zero. Missing legacy summary uses the legacy wording above. Render safe historical IDs/version when a historical title is unavailable; do not reinterpret an old ID as a new lesson. Keep **Progressive help used** separately and unchanged. No preparation-only completion screen or deck strengthening action exists.

## 6. Contracts preserved and intentional differences

- Meaningful Italian and existing mixed-language handling remain in `detectTeachingPhrase` and the two episode evaluators. Preserve English guess rejection and Italian-framed mixed nouns; do not use preparation visitation as a response bypass.
- Preserve partial/failed/accepted/exit feedback, including Day 0 clarification moving to a new turn without issuing a key and Day 1 partial retries staying on their turn. Existing explicit understanding remains a truthful brief option, not proven factual recall.
- Keep `submitEpisodeResponse` atomic and hydration of historical pending terminals idempotent. Playback, preparation completion and animation callbacks cannot finalize effects.
- Help remains owner-chosen at every level. Reopening preparation never spends a help level, reveals a pending full model by default, or clears support history.
- Preserve normal/careful audio, typed interaction, transcript access and no microphone requirement. Add a clearly labeled text-only live readiness path for these days. No forced listening duration or speaking.
- Exits remain available through typed existing exit language during the encounter; brief good-night/leave patterns are taught. During preparation, overview navigation leaves the unresolved attempt without submitting a fabricated exit. No mandatory optional social exchange.
- Focus, Escape restoration, readable Italian, visible keyboard focus, mobile touch size and text alternatives are specified above. Audio playback never steals focus or automatically submits.
- Days 2–30, guided Day 4, Trip Mode, deck policy, schedule and authoritatively recorded outcomes remain outside the repair. Generic additions activate only for definitions with preparation data. Do not repurpose the beach-only guided-session domain.
- Changed defaults are limited to ordinary preparation before response, same-current-day resume instead of accidental reseed, explicit start/replay labeling where affected, separate preparation history, and text-only live readiness. These changes resolve preparation/accessibility gaps without changing response success rules.

## 7. Implementation handoffs

### T2 — Preparation in the ordinary journey

**Dependency:** this T1 specification; reconcile source identity before editing. T2 may create the data structures needed for T3, but does not claim the complete learning loop is done until T3's pattern/example/handoff work is integrated.

**Expected existing modules:** `app/season/types.ts`, `app/season/episodes/day-00.ts`, `day-01.ts`, `app/season/manifest.ts` (truthful content-version metadata only), `app/game/model.ts`, `app/game/persistence.ts`, `app/prototype/PrototypeApp.tsx`, `PrototypeViews.tsx`, `usePrototypePresentation.ts`, `useApplicationSession.ts`, and existing [global styles](../web/app/globals.css). Registry/authoring validation should verify owned audio/turn references. No independent content registry or new storage key.

**Work:** author the complete preparation content under the owning definitions; implement situation/listening and later-turn briefs, shared presentation gate, normal/careful preparation playback and transcript, separate activity normalization, first-entry/legacy-active routing, overview resume behavior and keyboard/mobile layout. Preparation playback must not use live readiness/support callbacks. T2 owns the new optional content/state shape; T3 completes traversal/summary semantics. During partial T2 implementation, keep an explicit engineering boundary before a not-yet-implemented pattern/handoff; do not silently ship an abbreviated flow as the finished repair.

A small generic preparation view/helper may be extracted under `app/prototype/` if composition requires it; this is a proposed new module, not an inspected existing file. Its content comes only from the definition and its mutations are restricted to preparation activity. Generic reset integration in `app/game/engine.ts` may clear this optional activity with interaction reset; no day-specific evaluator logic is added.

**Focused verification:** extend existing `tests/presentation-contract.test.ts`, `tests/interaction-coordinator.test.ts`, `tests/game-engine.test.ts`, `tests/season-architecture.test.ts`, and `tests/demo-session.test.ts` as appropriate. Prove ordinary fresh setup reaches preparation before a composer; Day 1 and later-turn gating work; audio/read activity changes no authoritative fields; legacy later-turn key state survives; invalid prep data cannot wipe valid game state; overview return resumes; preparation audio failure permits reading; owner/demo generation guards prevent stale saves. Check normal/careful asset reference validity. Inspect focused desktop/mobile preparation screens on disposable engineering state when authorized in T2, preserving the rejected origin.

**Exit:** relevant comprehension is visible in ordinary Day 0–1 entry and at new-material turns, media/text/navigation work, and focused state/entry checks pass. Record exactly what is implemented versus reserved for T3. This is not T4 integrated qualification or demo readiness.

**Technical uncertainty:** actual component extraction and focus/audio cancellation races need implementation evidence; content, asset choices, gating, and persistence policy are resolved here. No product blocker remains.

### T3 — Practice and encounter handoff

**Dependency:** T2 content, gate and preparation state; retain this specification's no-input worked-example decision.

**Expected existing modules:** T2's episode/type/view/presentation/state modules; `app/game/engine.ts` reset/result transaction integration only; `app/season/types.ts` `buildObservedEpisodeResult`; `app/game/persistence.ts` result normalization; `PrototypeViews.tsx` `OutcomeCard`, `EncounterStage`, `ResponseComposer`, and `WorldPanel`; `PrototypeApp.tsx` help/return/replay handlers. Session snapshot/seed paths in `app/persistence/session.ts` and Admin need verification, not another authority. `app/season/pocket-deck-handoff.ts` should remain behaviorally unchanged and covered against preparation-only evidence.

**Work:** display explained patterns, text examples and reflections, explicit handoff pages and empty composer; implement live **Read the line**, **Review preparation** detours, focused return and draft preservation in memory; complete exact-page duplicate guards and replay resets; snapshot preparation activity with the real result; render separate factual review details and truthful legacy absence. Preserve previous-turn feedback when a brief intervenes. No preparation examples are inserted into the response or recorded as phrase practice.

**Focused verification:** extend `tests/progressive-help.test.ts`, `tests/teaching-feedback.test.ts`, `tests/presentation-contract.test.ts`, `tests/interaction-coordinator.test.ts`, `tests/game-engine.test.ts`, `tests/pocket-deck.test.ts`, and `tests/demo-session.test.ts` where they cover the changed boundary. Run affected Day 0–1 response matrices unchanged. Add targeted browser scenarios in existing interaction/help/feedback acceptance scripts for the full first-response bridge, later briefs, help level preservation through a detour, text-only readiness, reload at each page/live/review boundary, explicit replay versus preparation revisit, double navigation/submission, partial retry, and exits before/after key issue. Old resolved results and historical season completion survive. Preparation-only paths produce no result or deck evidence. Later-day definitions without preparation retain existing rendering/behavior.

**Exit:** both complete sequences in section 3 work in ordinary use, no new assessment engine exists, support/result snapshots are accurate, reload/return/replay behavior is covered, and focused checks pass. Record evidence and limitations; move to T4, not T5 or owner review.

**Technical uncertainty:** rendering old review summaries after future content-version changes and focus restoration when the invoking node unmounts need tests against the specified fallback behavior. No unresolved teaching or flow choice blocks T3.

### Documentation and subsequent slices

T2/T3 update [Product](PRODUCT.md), [Architecture](ARCHITECTURE_AND_SSOT.md), [Episode authoring](EPISODE_AUTHORING_GUIDE.md), and [Development](DEVELOPMENT.md) to distinguish implemented portions from this target specification. T4 reconciles final docs and owns full integrated/browser/offline/security qualification plus setup-warning disposition. T5 owns clean candidate/hosted proof and separate demo preparation under applicable Git authorization. T6 owns owner-run acceptance. None is started by T1.

## 8. T1 validation record

Source inspection covered the actual entry, turns, evaluator/fallback, progressive support, feedback, media paths, engine transaction/reset, game hydration, result builder, session isolation, completion presentation, and deck handoff contracts. Both required first-response teaching sequences and every reachable later nonterminal Day 0–1 turn have concrete copy. The owned but ordinarily unreachable optional turn is explicitly handled without adding a new route.

Design review confirms: comprehension precedes response; patterns explain intent; different-situation examples do not weaken validation; media references exist; preparation cannot complete an encounter; reload/return/replay/support rules are explicit; legacy data has additive compatibility handling; desktop/mobile/focus/text behavior is specified; T2/T3 have separate modules, dependencies, scenarios and exit criteria. No material contradiction or specification blocker remains.

Documentation verification: `git diff --check`, Markdown local-link/fragment and table-shape checks on changed Markdown, and all 18 referenced Day 0–1 audio files checked for nonempty presence. No separate documentation formatter/link command is configured in `web/package.json` or the development guide; the local checks cover this specification-only change. No app build, runtime tests, audio listening campaign, hosted checks, browser interaction, owner demo, dependency changes, commit or push was performed. Runtime suitability of the proposed design remains for T2–T4; D0-01 closes only through owner acceptance of a qualified replacement candidate.
