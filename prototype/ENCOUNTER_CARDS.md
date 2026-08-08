# Facilitator Encounter Cards

Do not show this file to the player before or during the run. Present only the objective, visible facts, selected audio, and earned consequence.

All support requests are valid. `Replay/transcript` in these cards includes normal replay, careful-speed replay, and exact Italian transcript reveal.

---

## Encounter 1 — Day 0 hotel arrival and key

### Player-facing objective

> You have arrived tired at Hotel Sirena in Salerno. Get your room key and enough information to reach the room, then end the interaction when you want.

### Authoritative entry state

- Time: 21:40.
- Booking: confirmed and prepaid for surname `Fuscoletti`, two nights, room 12.
- Key: not issued.
- Elena may ask only what is required to find the booking before key handoff.

### Audio path

1. Play [`e01_01_name.m4a`](audio/normal/e01_01_name.m4a): `Buonasera. Ha una prenotazione? A che nome?`
2. If the player provides the correct/recognizable surname, booking evidence, or unambiguous check-in identity, play [`e01_03_key.m4a`](audio/normal/e01_03_key.m4a).
3. If identity is ambiguous, play [`e01_02_clarify_name.m4a`](audio/normal/e01_02_clarify_name.m4a): `Mi scusi, può ripetere il cognome?`
4. After identity is resolved, the key is issued and room/floor fact is available. Play [`e01_04_breakfast.m4a`](audio/normal/e01_04_breakfast.m4a).
5. Only if the player has not already ended the interaction, Elena may play the optional line [`e01_05_optional.m4a`](audio/normal/e01_05_optional.m4a).
6. A defer/decline/exit receives [`e01_06_boundary.m4a`](audio/normal/e01_06_boundary.m4a) and ends immediately.

Use the identically named file in `audio/careful/` when the player asks for slower audio.

### Essential interpretation

| Intent | Minimum evidence | Rule |
|---|---|---|
| Identify booking | Correct surname, clear booking reference, or shown confirmation | Issue key; exact Italian sentence not required |
| Ask repetition | Any clear repetition/clarification request | Replay or careful audio; no state mutation |
| Confirm room/floor | Player accurately acknowledges 12 / first floor | Mark fact understood |
| Defer conversation | Tiredness, later/tomorrow, no thanks, or clear departure | End immediately; never require explanation |
| Answer optional question | Any plausible yes/no/brief visit answer | Elena acknowledges once; do not open another topic |

`Ciao. La camera, Fuscoletti`, surname alone, or showing the booking can succeed. A wrong surname cannot.

### Allowed outcomes

| ID | Requirements | Exact effects | Consequence |
|---|---|---|---|
| **E1-O1 Direct/supported success** | Identity resolved; player remains through room direction | Key issued; room 12/first floor known; time +3 minutes; breakfast known only if understood | Player can go directly to the room |
| **E1-O2 Clarified success** | Identity resolved after one or two clarifications or shown booking | Same as O1; time +5 minutes | Slight delay, no social penalty |
| **E1-O3 Minimal exit** | Identity resolved and key issued; player leaves before breakfast or optional turn | Key issued; room 12/first floor known; breakfast may remain unknown; time +3 minutes | Complete practical success |
| **E1-O4 Abandoned check-in** | Player leaves or requests pause before identity resolves | No key; booking remains valid; time +2 minutes; lobby recovery remains | Objective unresolved but world coherent |

### Feedback priority

1. Wrong or unclear identity that blocked key issuance.
2. Meaning-changing room/floor misunderstanding.
3. Recurrent Italian `sì` versus Spanish `si` only if it affected interpretation; accent spelling alone is not worth correction.
4. Naturalness feedback only if requested.

### Forbidden facilitator behavior

- Do not ask where the player came from, why they are in Italy, or how long they plan to stay before issuing the valid key.
- Do not withhold breakfast information to elicit a complete sentence.
- Do not treat `Sono stanco`, `Più tardi`, thanks, or departure as a failed social choice.

---

## Encounter 2 — Day 4 beach rental

### Player-facing objective

> At Lido Piccola Luna, rent one beach chair and one umbrella for today without accidentally buying a two-chair package. You may leave without renting if you prefer.

### Visible context

- The kiosk displays chairs and umbrellas.
- The lido closes at 18:00.
- The player may pay by card or cash.

### Authoritative entry state

| Item | Availability | Price |
|---|---:|---:|
| One chair + one umbrella, day | 1 set | €22.00 |
| Standard two-chair + one umbrella package, day | 1 set | €30.00 |
| One chair only, day | 2 | €12.00 |

No discount, half-day rate, reservation, or other equipment exists in this prototype.

### Audio path

1. Play [`e02_01_need.m4a`](audio/normal/e02_01_need.m4a): `Buongiorno. Cosa le serve?`
2. After a plausible equipment request, play [`e02_02_standard_offer.m4a`](audio/normal/e02_02_standard_offer.m4a). This is an offer, not a charge.
3. If quantity is ambiguous or contradictory, play [`e02_03_quantity.m4a`](audio/normal/e02_03_quantity.m4a).
4. Select one confirmation:
   - custom set: [`e02_04_custom.m4a`](audio/normal/e02_04_custom.m4a);
   - standard package: [`e02_05_standard.m4a`](audio/normal/e02_05_standard.m4a);
   - chair only: [`e02_06_chair.m4a`](audio/normal/e02_06_chair.m4a).
5. Charge only after the player clearly confirms one quoted option.
6. After a rental, play [`e02_07_close.m4a`](audio/normal/e02_07_close.m4a).
7. A refusal/exit gets [`e02_08_exit.m4a`](audio/normal/e02_08_exit.m4a) and no charge.

### Essential interpretation

The essential slots are equipment, quantity, and duration. `Vorrei un beach chair e un umbrella per oggi`, `Uno solo con ombrellone`, or natural complete Italian can identify the custom set. `Sì` before a specific quoted option does not safely identify quantity.

| Intent | Rule |
|---|---|
| Ask price | Quote only the relevant authored option; do not charge |
| Request one chair + umbrella | Offer E2-O1 and require confirmation after €22 quote |
| Accept standard package | Offer E2-O2 and require confirmation after €30 quote |
| Request chair only | Offer E2-O3 and require confirmation after €12 quote |
| Refuse/leave | Apply E2-O4 immediately |
| Bargain or request unavailable item | State that only listed options are available; player may choose or leave |

### Allowed outcomes

| ID | Requirements | Exact effects | Consequence |
|---|---|---|---|
| **E2-O1 Intended rental** | One chair + umbrella explicitly confirmed after quote | Money −€22.00; add chair/umbrella day rental; return by 18:00; time +5 minutes | Objective achieved |
| **E2-O2 Standard package** | Two-chair package explicitly confirmed after quote | Money −€30.00; add standard package rental; return by 18:00; time +5 minutes | More expensive but valid choice |
| **E2-O3 Chair only** | Chair-only option explicitly confirmed after quote | Money −€12.00; add chair rental; return by 18:00; time +4 minutes | Partial shade objective, chosen compromise |
| **E2-O4 No rental** | Player declines or leaves | Money unchanged; no rental; time +2 minutes | Valid abandonment/alternative path |

### Feedback priority

1. Any quantity wording that could have caused the wrong charge.
2. Italian nouns after successful English/Spanish substitution: `lettino` and `ombrellone`.
3. Natural request frame only if requested.

Suggested feedback for mixed nouns:

- **What we understood:** One beach chair and one umbrella for today.
- **Natural Italian:** `Vorrei un lettino e un ombrellone per oggi.`
- **Useful variation:** `Solo un lettino, grazie.`

### Forbidden facilitator behavior

- Never charge from the initial request or a vague `sì`.
- Never invent a discount because the player bargains effectively.
- Never ask why the player needs only one chair.

---

## Encounter 3 — Day 13 wrong café order and bill

### Player-facing objective

> You ordered one cappuccino. A latte macchiato arrived instead, and the bill also includes an orange juice you never ordered. Resolve whichever parts matter to you, then pay or deliberately leave the dispute open.

Show the player this receipt after playing the opening audio:

```text
BAR GABBIANO
Latte macchiato       €3,00
Spremuta              €4,50
TOTALE                €7,50
NON PAGATO
```

### Authoritative entry state

- Ordered: cappuccino, €2.50.
- Delivered: latte macchiato, €3.00.
- Extra receipt line: spremuta, €4.50; not delivered and not ordered.
- Presented total: €7.50, unpaid.
- Giulia may correct the drink, the bill, both, or call the manager. She may not offer future credit or a free item.

### Audio path

1. Play [`e03_01_present.m4a`](audio/normal/e03_01_present.m4a), then show the receipt.
2. If the player’s complaint does not reveal which issue matters, play [`e03_02_clarify.m4a`](audio/normal/e03_02_clarify.m4a).
3. Match the complaint:
   - drink only: play [`e03_03_drink_only.m4a`](audio/normal/e03_03_drink_only.m4a);
   - bill only: play [`e03_04_bill_only.m4a`](audio/normal/e03_04_bill_only.m4a);
   - both clearly named: play [`e03_05_both.m4a`](audio/normal/e03_05_both.m4a).
4. If the player keeps the latte after the bill correction, play [`e03_06_keep_latte.m4a`](audio/normal/e03_06_keep_latte.m4a).
5. If the player asks for escalation or rejects every allowed remedy, play [`e03_07_manager.m4a`](audio/normal/e03_07_manager.m4a).
6. When both issues are fixed, play [`e03_08_final.m4a`](audio/normal/e03_08_final.m4a).

### Essential interpretation

Treat the drink and receipt line as separate state facts.

| Player meaning | Facilitator action |
|---|---|
| “This is not what I ordered” | Propose drink correction only; explicitly preserve current bill until challenged |
| “I didn’t order the juice” | Remove juice line; ask whether the player keeps the delivered latte only if needed |
| Names both wrong drink and extra juice | Offer both corrections directly; do not pretend one was missed |
| Accepts a stated remedy | Apply only what the NPC explicitly proposed |
| Says `va bene` without identifying whether the latte is kept | Ask one clarification before choosing €2.50 versus €3.00 |
| Pays original amount knowingly | Apply expensive partial E3-O4; do not silently mark errors fixed |
| Rejects resolution/leaves dispute | Apply E3-O5; no charge; open bill dispute remains |

### Allowed outcomes

| ID | Requirements | Exact effects | Consequence |
|---|---|---|---|
| **E3-O1 Both corrected** | Player identifies both issues and accepts both corrections | Remove latte and extra line; deliver cappuccino; charge €2.50; time +6 minutes; no open bill | Full practical success; Giulia remembers exact remedy |
| **E3-O2 Bill corrected, latte kept** | Extra line removed; player explicitly keeps latte | Charge €3.00; time +4 minutes; no open bill | Financial success, item compromise |
| **E3-O3 Drink corrected, extra line knowingly paid** | Cappuccino remade; player accepts/pays unchanged €7.50 bill | Charge €7.50; time +5 minutes; no open bill | Expensive partial outcome; receipt problem remains a remembered service failure |
| **E3-O4 Original result accepted** | Player knowingly keeps latte and pays €7.50 | Charge €7.50; time +2 minutes; no open bill | Both errors accepted; valid but costly |
| **E3-O5 Escalated/unresolved** | Player rejects allowed remedy or leaves dispute open | No charge; no drink retained; open disputed bill €7.50; manager callback; time +8 minutes | Recoverable unresolved state |

The facilitator may not create a €0.00 “everything free” resolution.

### Feedback priority

1. Language that confused drink repair with bill repair.
2. The past-order frame if the player uses a meaning-changing present fragment.
3. A recurring Spanish form if it could weaken the contrast.

Suggested correction:

- **What we understood:** You ordered a cappuccino, not the drink that arrived.
- **Natural Italian:** `Avevo ordinato un cappuccino.`
- **Useful variation:** `Questo non è quello che avevo ordinato.`

### Forbidden facilitator behavior

- Do not collapse the two errors into one state flag.
- Do not fix an unmentioned/unaccepted issue merely to create the best outcome.
- Do not make warmth, apology acceptance, or grammatical quality affect the refund.

---

## Encounter 4 — Day 21 familiar bartender, optional conversation

### Player-facing objective

> At Bar Gabbiano, order and pay for a drink. Giulia recognizes you. Any conversation beyond the transaction is optional.

### Authoritative entry state

- Giulia may offer the usual espresso (€2.00), but the player may correct it.
- Water is the only alternate prototype drink (€1.50).
- The player’s Day 19 ferry was cancelled; the player took the replacement bus.
- Giulia may know there was a ferry problem, but she does not know its outcome until the player states it.
- Giulia’s only authored personal fact for a follow-up is that she works until 14:00 and the morning has been busy.
- Social choice cannot change price, service, or practical success.

### Audio path

1. Play [`e04_01_usual.m4a`](audio/normal/e04_01_usual.m4a).
2. If the player requests water, play [`e04_02_water.m4a`](audio/normal/e04_02_water.m4a) and require confirmation before charge.
3. If the player accepts espresso, Giulia prepares it and plays the optional callback [`e04_03_callback.m4a`](audio/normal/e04_03_callback.m4a).
4. Interpret the response:
   - boundary, deferral, or no social answer: play [`e04_04_boundary_pay.m4a`](audio/normal/e04_04_boundary_pay.m4a);
   - a direct payment phrase such as `Con la carta`: play [`e04_04_direct_pay.m4a`](audio/normal/e04_04_direct_pay.m4a), apply payment, and end;
   - brief validated ferry account: play [`e04_05_account_pay.m4a`](audio/normal/e04_05_account_pay.m4a);
   - one question about Giulia: play [`e04_06_followup.m4a`](audio/normal/e04_06_followup.m4a), then request payment once;
   - no drink/leave: play [`e04_07_exit.m4a`](audio/normal/e04_07_exit.m4a).
5. Apply the drink charge only after product and payment are clear. Do not require an answer to the callback.

### Essential interpretation

| Response | Meaning and rule |
|---|---|
| `Sì, grazie`, `Il solito`, or clear espresso acceptance | Prepare espresso; optional callback may follow |
| `Con la carta` in response to callback | Player is completing payment, not failing conversation; use the direct-payment acknowledgment, charge €2, and end |
| `Più tardi`, `Un'altra volta`, `Devo andare`, or clear boundary | Acknowledge, request/complete payment, end without penalty |
| Brief statement that ferry was cancelled and player took bus | Validate against synthetic history; Giulia may remember it |
| Claim conflicting with canonical ferry history | Do not rewrite history; Giulia asks one neutral clarification or treats it as a misunderstanding |
| One question about Giulia’s day/work | Use only the authored fact in line e04_06; then close naturally |
| Correct usual to water | Quote €1.50 and confirm; do not treat correction as relationship damage |
| Decline all drinks/leave | No charge; immediate clean exit |

### Allowed outcomes

| ID | Requirements | Exact effects | Consequence |
|---|---|---|---|
| **E4-O1 Minimal espresso** | Espresso and payment confirmed; no ferry account | Charge €2.00; drink served; time +3 minutes; no new personal memory | Full practical success |
| **E4-O2 Espresso with boundary** | Espresso confirmed; player explicitly defers/declines callback | Charge €2.00; time +3 minutes; store only that the story was deferred if useful | Full practical success; no relationship penalty |
| **E4-O3 Espresso with brief account** | Espresso confirmed; player states validated ferry/bus outcome | Charge €2.00; time +5 minutes; Giulia may remember validated outcome | Full practical success with optional familiarity |
| **E4-O4 Corrected usual or no purchase** | Water confirmed, or all drinks declined | Water: charge €1.50/time +3; none: €0/time +1; correct assumed preference | Valid player-controlled alternative |

### Feedback priority

1. A claimed trip outcome that changes or contradicts canonical history.
2. Meaning-changing tense in the short account.
3. No correction for a valid transaction fragment or boundary.

### Forbidden facilitator behavior

- Do not wait for an answer to the ferry question before accepting payment.
- Do not lower price or increase warmth because the player converses.
- Do not penalize a corrected usual order.
- Do not invent Giulia’s family, plans, opinions, or friendship with the player.

---

## Cross-encounter dry-run cases

The facilitator or reviewer must verify these before treating the packet as runnable:

| Case | Expected behavior |
|---|---|
| Surname only at hotel | Key issued if recognizable as `Fuscoletti` |
| `Sono stanco. Più tardi.` after key | Elena acknowledges and ends immediately |
| `One chair e umbrella, per oggi` | Custom set proposed; €22 quote; charge only after confirmation |
| `Sì` before beach quantity is clear | Authored quantity clarification; no charge |
| Café complaint names only wrong drink | Drink remedy only; €7.50 bill remains visible until addressed |
| Café complaint clearly names both issues | Both remedies offered; no artificial extra repair turn |
| `Con la carta` after bartender callback | Payment and exit; no demand for ferry story |
| Player says ferry ran normally | State is not rewritten; one clarification at most |
| Player requests transcript first in every scene | Practical outcomes remain valid; observation records transcript-assisted evidence |
| Player types `Leave` in every scene | Apply each card’s valid abandonment/exit state without pedagogical resistance |
