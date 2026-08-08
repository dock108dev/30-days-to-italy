# Phase 2 Prototype Validation

**Validation date:** 2026-08-02

**Artifact status:** Supporting packet complete

**Phase status:** Superseded as the standalone prototype by the playable web app in [`../web/`](../web/); a user play session remains pending

## Artifact checks completed

| Check | Result |
|---|---|
| Required player, facilitator, encounter, state, observation, and audio-index documents exist | Pass |
| Markdown fences, tables, links, whitespace, and placeholder scan | Pass |
| Normal-speed audio count | 30 |
| Careful-speed audio count | 30 |
| Every normal clip has a same-named careful counterpart | Pass |
| Every referenced audio file exists | Pass |
| Every audio file is non-empty M4A/AAC media with a readable positive duration | Pass |
| Every careful clip is longer than its normal counterpart | Pass |
| All 17 allowed outcome IDs appear in both encounter rules and the state ledger | Pass |
| Player microphone/speech dependency | None |
| Application code, dependency, database, or framework introduced | None |

Audio was produced directly from the exact indexed Italian lines using installed Italian system voices. This establishes file/transcript source identity, but it is not a substitute for human review of naturalness and pronunciation.

## Dry-run state paths

### Path A — quiet intended path

- **E1-O3:** key issued; player leaves before optional conversation; €0.00.
- **E2-O1:** one chair + umbrella; €22.00.
- **E3-O1:** both café errors corrected; €2.50.
- **E4-O2:** espresso; ferry conversation deferred; €2.00.
- **Total charges:** €26.50.
- **Final money:** €73.50.
- **Result:** complete practical path with minimal/declined conversation and coherent state.

### Path B — expensive partial path

- **E1-O1:** hotel success with information; €0.00.
- **E2-O2:** standard two-chair package; €30.00.
- **E3-O4:** original café result knowingly accepted; €7.50.
- **E4-O4:** usual corrected to water; €1.50.
- **Total charges:** €39.00.
- **Final money:** €61.00.
- **Result:** coherent costly path without changing social treatment or inventing compensation.

### Path C — exit and recovery path

- **E1-O4:** check-in paused before identity resolution; no key, €0.00.
- **E2-O4:** no beach rental, €0.00.
- **E3-O5:** bill disputed and left open, €0.00 charged.
- **E4-O4:** no purchase, €0.00.
- **Final money:** €100.00 with one open €7.50 disputed-bill commitment.
- **Result:** all exits preserve explicit, recoverable state. Later prototype encounters remain runnable because the session deliberately samples nonconsecutive days with documented synthetic transitions.

### Consequential-ambiguity path

- Ambiguous hotel surname requires `e01_02_clarify_name`; no key before resolution.
- Ambiguous beach quantity requires `e02_03_quantity`; no charge before a quoted option is confirmed.
- A café complaint naming only one issue changes only that issue; the other remains visible.
- A bartender account conflicting with the synthetic ferry history cannot rewrite it.
- **Result:** every tested consequential ambiguity fails closed.

## Contract dry runs

| Input/path | Expected result | Status |
|---|---|---|
| Surname only at hotel | Valid identity can issue key | Pass by rule |
| `Sono stanco. Più tardi.` after key | Immediate acknowledged exit | Pass by rule/audio |
| `One chair e umbrella, per oggi` | Interpret custom set; quote €22; await confirmation | Pass by rule |
| Vague `sì` before quantity | Clarify; no mutation | Pass by rule/audio |
| Café complaint names both errors | Offer both fixes without artificial extra turn | Pass by rule/audio |
| `Con la carta` after optional callback | Complete payment and leave | Pass by rule/audio |
| Transcript requested in every scene | Outcomes remain valid; evidence marked transcript-assisted | Pass by protocol |
| Exit requested in every scene | Apply authored exit/abandonment; no pedagogical resistance | Pass by rule |

## What remains unvalidated

These require the player and cannot be completed offline:

- whether the normal audio is understandable but appropriately challenging;
- whether the installed voices sound natural enough for this prototype;
- whether optional conversation is perceived as genuinely optional;
- whether meaning-changing corrections feel concise and useful;
- whether manual intent interpretation matches what the player meant;
- whether the four-encounter session fits comfortably within 45 minutes; and
- whether the player would choose to return for the next day.

## Gate call

The facilitation packet remains complete and unblocked as supporting material. The playable web app is now the primary validation surface. Experiential evidence still requires one listen-and-type user session; no approval or spoken input is required before that run.
