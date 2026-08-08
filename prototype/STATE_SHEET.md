# Prototype State Sheet — Template

Create a dated copy for each run. This sheet is the sole authority for the paper prototype; the facilitator’s recollection and conversation text are not.

## Run metadata

| Field | Value |
|---|---|
| Run ID | _fill before session_ |
| Date/time and timezone | _fill before session_ |
| Facilitator | _fill before session_ |
| Player | Initial private learner |
| Content version | Phase 2 packet v1 |
| Run type | Non-production human-run prototype |

## Initial canonical state

| Category | State |
|---|---|
| Time | Day 0, 21:40 |
| Location | Hotel Sirena front desk, Salerno |
| Money | €100.00 available; hotel already paid |
| Inventory | Phone, wallet, confirmed Hotel Sirena booking |
| Keys | None |
| Reservations | Hotel Sirena, surname `Fuscoletti`, two nights, room 12 |
| Commitments | None |
| Character memory | None |
| Listening/support profile | Unknown; initialize from observed use |

## Synthetic time transitions

The prototype compresses four nonconsecutive season moments into one test run:

| Transition | Rule |
|---|---|
| After Encounter 1 | Move to Day 4, 10:00, Lido Piccola Luna; retain money/key evidence |
| After Encounter 2 | Move to Day 13, 09:30, Bar Gabbiano; retain cumulative money and rental outcome as past fact |
| After Encounter 3 | Move to Day 21, 11:00, Bar Gabbiano; inject only the reviewed synthetic history listed below |

### Reviewed synthetic history before Encounter 4

- Giulia recognizes the player.
- The player has ordered an espresso enough times for Giulia to offer `il solito`; it is still only an offer.
- On Day 13, store the actual café remedy from Encounter 3.
- On fictional Day 19, the player’s ferry was cancelled and the player took the replacement bus.
- Giulia may know about the ferry disruption because the player previously mentioned the trip plan.
- No friendship, invitation, personal biography, or preference beyond the usual espresso is implied.

## Encounter ledger

### Encounter 1 — Hotel arrival/key

| Field | Recorded value |
|---|---|
| Terminal outcome ID | _E1-O1 / E1-O2 / E1-O3 / E1-O4_ |
| Identity resolved? | _yes/no_ |
| Hotel key | _issued/not issued_ |
| Room/floor fact known | _room 12, first floor / unknown_ |
| Breakfast end known | _10:00 / unknown_ |
| Time after outcome | _record exact_ |
| Money effect | €0.00 |
| Player boundary | _minimal/defer/optional answer/none observed_ |
| Character memory | _only validated fact_ |

### Encounter 2 — Beach rental

| Field | Recorded value |
|---|---|
| Terminal outcome ID | _E2-O1 / E2-O2 / E2-O3 / E2-O4_ |
| Rental | _one chair + umbrella / standard package / chair only / none_ |
| Exact charge | _€22.00 / €30.00 / €12.00 / €0.00_ |
| Money after charge | _calculate from prior balance_ |
| Return obligation | _by 18:00 / none_ |
| Time after outcome | _record exact_ |
| Nadia memory | _actual package or no rental only_ |

### Encounter 3 — Wrong café order and bill

Canonical starting facts: player ordered one cappuccino (€2.50); one latte macchiato (€3.00) arrived; the presented €7.50 bill also contains an unordered spremuta (€4.50); bill is unpaid.

| Field | Recorded value |
|---|---|
| Terminal outcome ID | _E3-O1 / E3-O2 / E3-O3 / E3-O4 / E3-O5_ |
| Final drink | _cappuccino / latte macchiato / none/unresolved_ |
| Spremuta line | _removed/paid/unresolved_ |
| Exact charge | _€2.50 / €3.00 / €7.50 / €0.00 pending dispute_ |
| Money after charge | _calculate from prior balance_ |
| Open bill/commitment | _none or exact unresolved dispute_ |
| Time after outcome | _record exact_ |
| Giulia memory | _exact complaint and remedy only_ |

### Encounter 4 — Familiar bartender

Canonical starting price: espresso €2.00. Social response never changes price or service.

| Field | Recorded value |
|---|---|
| Terminal outcome ID | _E4-O1 / E4-O2 / E4-O3 / E4-O4_ |
| Drink | _espresso / corrected alternative / none_ |
| Exact charge | _€2.00 / authored alternative / €0.00_ |
| Money after charge | _calculate from prior balance_ |
| Ferry account chosen | _none/deferred/brief validated account_ |
| Optional follow-up | _none or exact authored topic_ |
| Boundary honored? | _yes/no_ |
| Giulia memory | _validated trip result or boundary only_ |

## Final reconciliation

| Check | Result |
|---|---|
| Initial money | €100.00 |
| Sum of exact charges | _fill_ |
| Expected final money | _fill_ |
| Recorded final money | _fill_ |
| Money reconciles exactly | _yes/no_ |
| Key state coherent | _yes/no_ |
| Rental and return state coherent | _yes/no_ |
| Café bill/remedy coherent | _yes/no_ |
| Character memories cite validated facts | _yes/no_ |
| Any invented state entered ledger | _yes/no; must be no_ |
| Canonical outcome complete for all four encounters | _yes/no_ |

## Outcome audit

For each mutation, record the allowed outcome ID. If an applied consequence cannot be mapped to one ID in `ENCOUNTER_CARDS.md`, the run has a critical state-boundary failure.
