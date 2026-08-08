# Facilitator Runbook

## Role

The facilitator operates the prototype; they do not teach a lesson or improvise a story. Their responsibilities are to:

- present the practical objective;
- play the specified Italian NPC clip;
- respond to player support requests;
- infer communicative intent conservatively;
- ask only necessary authored clarifications;
- apply only allowed outcomes to the state sheet;
- provide correction according to the feedback rule;
- record observations without assigning a score; and
- end an interaction as soon as the player chooses a valid exit.

The facilitator must not improve the scene by inventing prices, discounts, personal facts, promises, penalties, or relationships.

## Before the player begins

1. Create one run identifier using the local date and time.
2. Copy `STATE_SHEET.md` and `OBSERVATION_SHEET.md` into `completed_runs/`, adding the run identifier to both filenames.
3. Confirm audio files referenced in `audio/INDEX.md` play.
4. Give the player only `PLAYER_BRIEF.md`.
5. State: “You will hear Italian and type. You can request replay, slower audio, or transcript at any time. Your goal is the practical outcome.”
6. Do not preview target Italian or possible outcomes.

## Turn protocol

For every NPC turn:

1. **Orient:** state the player-facing objective and visible scene facts only.
2. **Play once:** play the normal-speed file. Do not show the transcript.
3. **Wait:** allow the player to type. Do not interpret hesitation as social obligation.
4. **Honor support:**
   - `Replay` — replay the same normal file.
   - `Slower` — play its careful-speed counterpart.
   - `Transcript` — show only the exact Italian transcript from the encounter card.
   - explicit request for English meaning — provide a concise meaning and mark `meaning fallback used`.
5. **Interpret conservatively:** match the response to an allowed intent and extract essential details. Mixed language is acceptable. If a consequential detail is ambiguous, play the authored clarification clip or ask the exact authored clarification in Italian.
6. **Resolve:** apply one allowed outcome only when its requirements are met. Record exact state effects immediately.
7. **Respond in character:** play the appropriate fixed response if one exists. If no clip exists, use the card’s exact Italian line; do not expand it.
8. **Correct after consequence:**
   - automatically show one correction only if the player’s wording could change meaning or exhibits the card’s priority recurring issue;
   - use `What we understood / Natural Italian / Useful variation`;
   - keep naturalness-only feedback collapsed unless requested.
9. **Offer no extra turn:** continue only if the practical objective is unresolved or the player explicitly chooses an optional opening.
10. **Record evidence:** complete the encounter row in both run sheets.

## Interpretation categories

| Category | Facilitator action |
|---|---|
| Clear and consequentially safe | Apply the matching allowed outcome |
| Clear communicative move with English noun or Spanish crossover | Apply outcome if essential details are clear; model one Italian form afterward if valuable |
| Ambiguous but not consequential | Let the NPC confirm naturally; do not over-question |
| Ambiguous quantity, price, item, time, route, identity, or commitment | Require the authored clarification before mutation |
| Contradictory response | State the two interpretations briefly and ask which one the player means |
| Off-topic but harmless | NPC acknowledges briefly and returns to the practical need once |
| Requests an unavailable or invented option | NPC states the authored limit and offers only listed alternatives |
| Boundary or exit | Honor immediately when the card marks exit as valid |

Do not reward grammatical completeness by accepting an unsafe intent, and do not reject a useful fragment because it lacks grammar.

## Feedback examples

### Mixed-language request that succeeded

- **What we understood:** One beach chair and one umbrella for today.
- **Natural Italian:** `Vorrei un lettino e un ombrellone per oggi.`
- **Useful variation:** `Solo un lettino, grazie.`

### Meaning-changing café issue

- **What we understood:** You ordered a cappuccino, not the drink that arrived.
- **Natural Italian:** `Avevo ordinato un cappuccino.`
- **Useful variation:** `Questo non è quello che avevo ordinato.`

### Already-good fragment

Player types `Con la carta.` No correction is necessary.

## Timing and stopping rules

- Do not stretch an encounter to its target time.
- Allow at most two necessary repair turns for one essential detail. After that, offer the card’s constrained alternatives or an honest abandonment path.
- After the objective is resolved, allow at most one optional NPC opening unless the player explicitly asks another question.
- End any optional conversation within one additional NPC response after the player stops extending it.
- If facilitation or audio fails, preserve state and pause; do not label it learner failure.

## Debrief

Ask the player to type short answers:

1. Which line was hardest to understand before seeing text?
2. Did any NPC make it unclear whether you were allowed to leave?
3. Did any correction feel unnecessary, missing, or too long?
4. Did a consequence ever seem different from what you meant?
5. Would you choose to play the next day tomorrow?

Record the answers without arguing or explaining the design. Then make one recommendation:

- **Proceed to Phase 3** — central loop worked; revisions are bounded.
- **Revise and rerun Phase 2** — one or more central contracts failed but appear repairable.
- **Stop** — the listening/typing/consequence loop is not worth implementing in its current form.

## Critical-failure conditions

Any of these prevents a recommendation to proceed:

- a valid key or transaction was withheld for pedagogical conversation;
- a wrong quantity, price, identity, or commitment changed state without clarification;
- the facilitator needed an unlisted remedy or invented world fact to continue;
- a boundary or exit was refused after the objective permitted it;
- audio/transcript mismatch affected understanding;
- cumulative money or inventory could not be reconciled; or
- the player felt compelled to speak.
