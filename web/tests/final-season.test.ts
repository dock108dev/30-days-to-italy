import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponse,
  finishPendingOutcome,
  nextEpisodeState,
  restartEpisodeState,
  seedEpisodeState,
  type HistoryIdFactory,
} from "../app/game/engine";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { hydrateGameState, loadGame, saveGame, type LocalGameStorage } from "../app/game/persistence";
import { createDefaultLifecycleState, withLifecycleMode } from "../app/lifecycle/model";
import { clearAllLocalState } from "../app/persistence/reset";
import { CORE_POCKET_DECK_CARD_BY_ID, CORE_POCKET_DECK_CARDS } from "../app/pocket-deck/catalog";
import { IMPLEMENTED_EPISODES, SEASON_01 } from "../app/season/manifest";

function ids(): HistoryIdFactory {
  let index = 0;
  return () => `final-${++index}`;
}

function respond(state: GameState, response: string, createId: HistoryIdFactory): GameState {
  const result = applyResponse(state, response, createId);
  assert.equal(result.kind, "advanced", `${state.episodeId}: ${response}`);
  return result.state;
}

function finish(state: GameState, createId: HistoryIdFactory): GameState {
  return state.pendingOutcome ? finishPendingOutcome(state, createId) : state;
}

function complete(state: GameState, responses: readonly string[], createId: HistoryIdFactory): GameState {
  for (const response of responses) state = respond(state, response, createId);
  return finish(state, createId);
}

function completeDay30(createId: HistoryIdFactory, state = seedEpisodeState(initialState(), "day-30")): GameState {
  return complete(state, ["Ecco tutte le chiavi.", "È tutto a posto?", "Parto domani mattina."], createId);
}

function memoryStorage(): { values: Map<string, string>; storage: LocalGameStorage } {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
}

test("the full registry has 31 playable sessions and no planned placeholders", () => {
  assert.equal(SEASON_01.length, 31);
  assert.equal(IMPLEMENTED_EPISODES.length, 31);
  assert.equal(SEASON_01.every((episode) => episode.status === "implemented"), true);
});

test("every final-arc episode has a clean early exit", () => {
  const createId = ids();
  for (let day = 22; day <= 30; day += 1) {
    const episodeId = `day-${String(day).padStart(2, "0")}` as GameState["episodeId"];
    const exited = finish(respond(seedEpisodeState(initialState(), episodeId), "Basta.", createId), createId);
    assert.equal(exited.status, "resolved", `${episodeId} should resolve its early exit`);
    assert.ok(exited.money >= 0);
  }
});

test("Days 22 through 30 complete the canonical season at €5.80", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-22");
  const route: readonly [GameState["episodeId"], readonly string[]][] = [
    ["day-22", ["Cosa mi consiglia?", "Prendo il panino caprese."]],
    ["day-23", ["Prendo il pacco, grazie.", "No, grazie. Devo andare."]],
    ["day-24", ["Allora vado via."]],
    ["day-25", ["Forse. Non lo so ancora."]],
    ["day-26", ["Preferirei un tavolo tranquillo."]],
    ["day-27", ["Ora l'acqua calda funziona.", "Posso avere un buono?"]],
    ["day-28", ["Dove devo cambiare?", "Alle nove e trentacinque dallo stallo tre.", "Pago due euro e quaranta."]],
    ["day-29", ["Un espresso, grazie.", "Non lo so ancora.", "Con la carta."]],
    ["day-30", ["Ecco le chiavi dell'appartamento e dell'hotel.", "È tutto a posto?", "Parto domani mattina."]],
  ];

  for (const [episodeId, responses] of route) {
    assert.equal(game.episodeId, episodeId);
    game = complete(game, responses, createId);
    if (episodeId !== "day-30") {
      assert.equal(game.status, "resolved");
      game = nextEpisodeState(game);
    }
  }

  assert.equal(game.status, "complete");
  assert.equal(game.money, 580);
  assert.equal(game.completed.length, 31);
  assert.equal(game.hotelKey, false);
  assert.equal(game.apartmentKey, false);
  assert.deepEqual(game.keyCustody, { hotel: "returned", apartment: "returned" });
  assert.equal(game.secondParcelStatus, "collected");
  assert.equal(game.invitationResponse, "maybe");
  assert.equal(game.eventAttendance, "unknown");
  assert.equal(game.repairCreditStatus, "issued");
  assert.equal(game.transportPlan?.stand, "3");
  assert.equal(game.stayResponse, "not-sure");
  assert.equal(game.seasonCompletion?.outcomeId, "D30-O1");
  assert.equal(game.seasonCompletion?.completedEpisodeIds.length, 31);
  assert.equal(game.seasonCompletion?.openIssues.length, 0);
});

test("Day 30 early exit, missing keys, and malformed completion never complete", () => {
  const createId = ids();
  const early = finish(respond(seedEpisodeState(initialState(), "day-30"), "Devo andare.", createId), createId);
  assert.equal(early.status, "resolved");
  assert.equal(early.outcome?.id, "D30-O4");
  assert.equal(early.seasonCompletion, null);

  const missing = finish(respond(seedEpisodeState(initialState(), "day-30"), "Ho perso una chiave.", createId), createId);
  assert.equal(missing.status, "resolved");
  assert.equal(missing.outcome?.id, "D30-O3");
  assert.equal(missing.departureStatus, "blocked");

  const forged = hydrateGameState({
    ...early,
    schemaVersion: 5,
    status: "complete",
    seasonCompletion: {
      attempt: 1,
      outcomeId: "D30-O4",
      keyResolution: { hotel: "returned", apartment: "returned" },
      obligations: ["forged"],
      openIssues: [],
      departurePlan: "forged",
      completedEpisodeIds: SEASON_01.map((episode) => episode.id),
      reflectionInputs: { vendorPreference: null, tablePreference: "none", stayResponse: "unknown" },
    },
  });
  assert.equal(forged.status, "resolved");
  assert.equal(forged.seasonCompletion, null);
});

test("Day 30 may complete with one explicit issue only after keys resolve", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-30");
  game = respond(game, "Ecco tutte le chiavi.", createId);
  game = respond(game, "C'è ancora un problema con il pacco.", createId);
  game = respond(game, "Parto domani alle otto.", createId);
  game = finish(game, createId);
  assert.equal(game.status, "complete");
  assert.equal(game.outcome?.id, "D30-O2");
  assert.deepEqual(game.keyCustody, { hotel: "returned", apartment: "returned" });
  assert.deepEqual(game.seasonCompletion?.openIssues, ["Parcel follow-up remains open"]);
});

test("a completed-season record survives hydration and episode replay", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-30");
  game = complete(game, ["Ecco tutte le chiavi.", "È tutto a posto?", "Parto domani mattina."], createId);
  const completion = structuredClone(game.seasonCompletion);
  const restored = hydrateGameState(game);
  assert.deepEqual(restored.seasonCompletion, completion);
  const replay = restartEpisodeState(restored);
  assert.equal(replay.status, "active");
  assert.deepEqual(replay.seasonCompletion, completion);
});

test("season completion is durable history across replay, failure, other episodes, modes, and reset", () => {
  const createId = ids();
  const completed = completeDay30(createId);
  const firstRecord = structuredClone(completed.seasonCompletion);
  assert.ok(firstRecord);

  const activeReplay = hydrateGameState(restartEpisodeState(completed));
  assert.equal(activeReplay.status, "active");
  assert.deepEqual(activeReplay.seasonCompletion, firstRecord);

  const failedReplay = hydrateGameState(complete(activeReplay, ["Ho perso la chiave."], createId));
  assert.equal(failedReplay.status, "resolved");
  assert.equal(failedReplay.outcome?.id, "D30-O3");
  assert.deepEqual(failedReplay.seasonCompletion, firstRecord);

  const otherEpisode = hydrateGameState(seedEpisodeState(failedReplay, "day-22"));
  assert.equal(otherEpisode.episodeId, "day-22");
  assert.equal(otherEpisode.status, "active");
  assert.deepEqual(otherEpisode.seasonCompletion, firstRecord);

  const lifecycle = createDefaultLifecycleState();
  const trip = withLifecycleMode(lifecycle, "trip");
  const prepare = withLifecycleMode(trip, "prepare");
  assert.equal(prepare.mode, "prepare");
  assert.deepEqual(otherEpisode.seasonCompletion, firstRecord);

  const { values, storage } = memoryStorage();
  saveGame(storage, completed);
  assert.ok(loadGame(storage).seasonCompletion);
  clearAllLocalState(storage);
  assert.equal(values.has(STORAGE_KEY), false);
  assert.equal(loadGame(storage).seasonCompletion, null);

  const secondCompletion = complete(
    restartEpisodeState(completed),
    ["Ecco tutte le chiavi.", "C'è ancora un problema con il pacco.", "Parto domani alle otto."],
    createId,
  );
  assert.equal(secondCompletion.status, "complete");
  assert.equal(secondCompletion.seasonCompletion?.attempt, firstRecord.attempt + 1);
  assert.equal(secondCompletion.seasonCompletion?.outcomeId, "D30-O2");
  assert.notDeepEqual(secondCompletion.seasonCompletion, firstRecord);
});

test("malformed or contradictory completion claims fail closed without coupling valid history to the current attempt", () => {
  const createId = ids();
  const completed = completeDay30(createId);
  const valid = completed.seasonCompletion;
  assert.ok(valid);

  const malformed = [
    { ...valid, keyResolution: { hotel: "held", apartment: "returned" } },
    { ...valid, keyResolution: { hotel: "returned", apartment: "missing" } },
    { ...valid, completedEpisodeIds: valid.completedEpisodeIds.slice(0, -1) },
    { ...valid, completedEpisodeIds: [...valid.completedEpisodeIds.slice(0, -1), "day-29"] },
    { ...valid, outcomeId: "D30-O4" },
    { ...valid, obligations: valid.obligations.filter((item) => item !== "All held keys returned") },
    { ...valid, obligations: valid.obligations.filter((item) => item !== "Repair and balance reviewed") },
    { ...valid, obligations: valid.obligations.filter((item) => item !== "Departure plan confirmed") },
    { ...valid, departurePlan: "   " },
    { ...valid, openIssues: ["Parcel follow-up remains open"] },
    {
      ...valid,
      outcomeId: "D30-O2",
      openIssues: ["Parcel follow-up remains open"],
      obligations: valid.obligations,
    },
    {
      ...valid,
      outcomeId: "D30-O2",
      openIssues: ["Unsupported issue"],
      obligations: [...valid.obligations, "Open issue acknowledged: Unsupported issue"],
    },
  ];

  for (const candidate of malformed) {
    const restored = hydrateGameState({ ...completed, seasonCompletion: candidate });
    assert.equal(restored.seasonCompletion, null);
    assert.equal(restored.status, "resolved");
  }

  let day29 = seedEpisodeState(initialState(), "day-29");
  day29 = complete(day29, ["Un espresso.", "Non lo so ancora.", "Pago."], createId);
  const contradictory = hydrateGameState({ ...day29, status: "complete", seasonCompletion: valid });
  assert.equal(contradictory.status, "resolved");
  assert.equal(contradictory.outcome?.id, "D29-O1");
  assert.deepEqual(contradictory.seasonCompletion, valid);

  const failedCurrent = complete(restartEpisodeState(completed), ["Basta."], createId);
  const historical = hydrateGameState({ ...failedCurrent, status: "complete" });
  assert.equal(historical.status, "resolved");
  assert.equal(historical.outcome?.id, "D30-O4");
  assert.deepEqual(historical.seasonCompletion, valid);
});

test("Day 30 requires exact issue acknowledgement and distinguishes every unresolved boundary", () => {
  const createId = ids();
  let savedIssue: GameState = {
    ...seedEpisodeState(initialState(), "day-30"),
    openIssues: ["Parcel follow-up remains open"],
  };
  savedIssue = respond(savedIssue, "Ecco tutte le chiavi.", createId);
  assert.match(savedIssue.history.at(-1)?.text ?? "", /Parcel follow-up remains open/);
  savedIssue = respond(savedIssue, "È tutto a posto.", createId);
  assert.equal(savedIssue.turnId, "d30_02_summary");
  assert.equal(savedIssue.pendingOutcome, null);
  assert.equal(savedIssue.checkoutObligations.some((item) => item.startsWith("Open issue acknowledged")), false);
  savedIssue = respond(savedIssue, "C'è ancora un problema con il pacco.", createId);
  savedIssue = respond(savedIssue, "Parto domani mattina.", createId);
  savedIssue = finish(savedIssue, createId);
  assert.equal(savedIssue.status, "complete");
  assert.equal(savedIssue.outcome?.id, "D30-O2");
  assert.ok(savedIssue.seasonCompletion?.obligations.includes("Open issue acknowledged: Parcel follow-up remains open"));

  for (const [hotelKey, apartmentKey, expected] of [
    [true, false, { hotel: "missing", apartment: "not-held" }],
    [false, true, { hotel: "not-held", apartment: "missing" }],
  ] as const) {
    const state = {
      ...seedEpisodeState(initialState(), "day-30"),
      hotelKey,
      apartmentKey,
      keyCustody: { hotel: hotelKey ? "held" as const : "not-held" as const, apartment: apartmentKey ? "held" as const : "not-held" as const },
    };
    const missing = finish(respond(state, "Ho perso la chiave.", createId), createId);
    assert.equal(missing.outcome?.id, "D30-O3");
    assert.deepEqual(missing.keyCustody, expected);
    assert.equal(missing.seasonCompletion, null);
  }

  const beforeKeys = finish(respond(seedEpisodeState(initialState(), "day-30"), "Basta.", createId), createId);
  assert.equal(beforeKeys.outcome?.id, "D30-O4");
  let afterKeys = respond(seedEpisodeState(initialState(), "day-30"), "Ecco tutte le chiavi.", createId);
  afterKeys = finish(respond(afterKeys, "Basta.", createId), createId);
  assert.equal(afterKeys.outcome?.id, "D30-O4");
  let beforeDeparture = respond(seedEpisodeState(initialState(), "day-30"), "Ecco tutte le chiavi.", createId);
  beforeDeparture = respond(beforeDeparture, "È tutto a posto.", createId);
  beforeDeparture = finish(respond(beforeDeparture, "Basta.", createId), createId);
  assert.equal(beforeDeparture.outcome?.id, "D30-O4");
});

test("every pending Day 30 branch survives reload and finalization is idempotent", () => {
  const createId = ids();
  let clean = seedEpisodeState(initialState(), "day-30");
  clean = respond(clean, "Ecco tutte le chiavi.", createId);
  clean = respond(clean, "È tutto a posto.", createId);
  clean = respond(clean, "Parto domani mattina.", createId);

  let issue = seedEpisodeState(initialState(), "day-30");
  issue = respond(issue, "Ecco tutte le chiavi.", createId);
  issue = respond(issue, "C'è ancora un problema con il pacco.", createId);
  issue = respond(issue, "Parto domani alle otto.", createId);

  const missing = respond(seedEpisodeState(initialState(), "day-30"), "Ho perso una chiave.", createId);
  const exit = respond(seedEpisodeState(initialState(), "day-30"), "Basta.", createId);
  const unresolvedSeed: GameState = {
    ...seedEpisodeState(initialState(), "day-30"),
    hotelKey: false,
    apartmentKey: true,
    keyCustody: { hotel: "missing", apartment: "held" },
  };
  const unresolved = respond(unresolvedSeed, "Ecco tutte le chiavi.", createId);

  for (const [pending, outcomeId, completes] of [
    [clean, "D30-O1", true],
    [issue, "D30-O2", true],
    [missing, "D30-O3", false],
    [exit, "D30-O4", false],
    [unresolved, "D30-O5", false],
  ] as const) {
    assert.equal(pending.pendingOutcome, outcomeId);
    const restored = hydrateGameState(pending);
    assert.equal(restored.pendingOutcome, outcomeId);
    const finalized = finishPendingOutcome(restored, createId);
    assert.equal(finalized.outcome?.id, outcomeId);
    assert.equal(finalized.status, completes ? "complete" : "resolved");
    const again = finishPendingOutcome(finalized, createId);
    assert.equal(again.money, finalized.money);
    assert.deepEqual(again.seasonCompletion, finalized.seasonCompletion);
    assert.deepEqual(again.episodeResults, finalized.episodeResults);
  }
});

test("Day 29 exits, answers, funds, and pending payment all preserve transaction truth", () => {
  const createId = ids();
  const startMoney = seedEpisodeState(initialState(), "day-29").money;
  const preOrderExit = finish(respond(seedEpisodeState(initialState(), "day-29"), "Basta.", createId), createId);
  assert.equal(preOrderExit.outcome?.id, "D29-O3");
  assert.equal(preOrderExit.money, startMoney);
  assert.equal(preOrderExit.observedMoves.includes("request"), false);

  let postOrderExit = respond(seedEpisodeState(initialState(), "day-29"), "Un espresso.", createId);
  postOrderExit = finish(respond(postOrderExit, "Basta.", createId), createId);
  assert.equal(postOrderExit.outcome?.id, "D29-O5");
  assert.equal(postOrderExit.money, startMoney);
  assert.ok(postOrderExit.observedMoves.includes("request"));
  assert.equal(postOrderExit.stayResponse, "unknown");

  for (const [answer, outcomeId, stayResponse] of [
    ["Non lo so ancora.", "D29-O1", "not-sure"],
    ["Sì, resto.", "D29-O2", "yes"],
    ["No, parto.", "D29-O2", "no"],
  ] as const) {
    const paid = complete(seedEpisodeState(initialState(), "day-29"), ["Un espresso.", answer, "Pago."], createId);
    assert.equal(paid.outcome?.id, outcomeId);
    assert.equal(paid.stayResponse, stayResponse);
    assert.equal(paid.money, startMoney - 200);
  }

  const lowFunds: GameState = { ...seedEpisodeState(initialState(), "day-29"), money: 100 };
  const refused = complete(lowFunds, ["Un espresso.", "Non lo so ancora.", "Pago."], createId);
  assert.equal(refused.outcome?.id, "D29-O4");
  assert.equal(refused.money, 100);

  let pending = seedEpisodeState(initialState(), "day-29");
  pending = respond(pending, "Un espresso.", createId);
  pending = respond(pending, "Non lo so ancora.", createId);
  pending = respond(pending, "Pago.", createId);
  assert.equal(pending.money, startMoney - 200);
  const restored = hydrateGameState(pending);
  const finalized = finishPendingOutcome(restored, createId);
  assert.equal(finalized.money, startMoney - 200);
  assert.equal(finishPendingOutcome(finalized, createId).money, startMoney - 200);
});

test("Day 24 preserves the first valid remedy across replay, reload, and malformed recovery", () => {
  const createId = ids();
  const base: GameState = {
    ...seedEpisodeState(initialState(), "day-24"),
    beachDayPassPaid: true,
    beachDayPassPrice: 800,
    money: 520,
  };

  const creditPending = respond(base, "Posso avere un buono?", createId);
  assert.equal(creditPending.pendingOutcome, "D24-O4");
  assert.equal(creditPending.beachDayPassPaid, false);
  let credit = finishPendingOutcome(hydrateGameState(creditPending), createId);
  assert.equal(credit.beachRemedy, "credit");
  assert.equal(credit.money, 520);
  assert.equal(credit.worldEvents.filter((event) => event === "day24-beach-credit-issued").length, 1);
  const creditAgain = complete(restartEpisodeState(hydrateGameState(credit)), ["Posso avere un altro buono?"], createId);
  assert.equal(creditAgain.outcome?.id, "D24-O7");
  assert.equal(creditAgain.beachRemedy, "credit");
  assert.equal(creditAgain.money, 520);
  assert.equal(creditAgain.worldEvents.filter((event) => event === "day24-beach-credit-issued").length, 1);
  credit = complete(restartEpisodeState(credit), ["Vorrei un rimborso."], createId);
  assert.equal(credit.outcome?.id, "D24-O7");
  assert.equal(credit.beachRemedy, "credit");
  assert.equal(credit.money, 520);
  assert.equal(credit.worldEvents.includes("day24-beach-refund-issued"), false);

  const refundPending = respond(base, "Vorrei un rimborso.", createId);
  assert.equal(refundPending.money, 1320);
  assert.equal(refundPending.pendingOutcome, "D24-O5");
  let refund = finishPendingOutcome(hydrateGameState(refundPending), createId);
  assert.equal(refund.beachRemedy, "refund");
  assert.equal(refund.money, 1320);
  assert.equal(refund.worldEvents.filter((event) => event === "day24-beach-refund-issued").length, 1);
  refund = complete(restartEpisodeState(refund), ["Posso avere un buono?"], createId);
  assert.equal(refund.outcome?.id, "D24-O7");
  assert.equal(refund.beachRemedy, "refund");
  assert.equal(refund.money, 1320);
  assert.equal(refund.worldEvents.includes("day24-beach-credit-issued"), false);

  const malformed = hydrateGameState({
    ...base,
    beachDayPassPaid: true,
    beachRemedy: "credit",
    worldEvents: ["day24-beach-credit-issued"],
  });
  assert.equal(malformed.beachDayPassPaid, false);
  assert.equal(malformed.beachRemedy, "credit");
  const blockedSecond = complete(malformed, ["Vorrei un rimborso."], createId);
  assert.equal(blockedSecond.outcome?.id, "D24-O7");
  assert.equal(blockedSecond.money, base.money);
  assert.equal(blockedSecond.worldEvents.includes("day24-beach-refund-issued"), false);
});

test("Day 24 remedies require a verified same-day paid entitlement", () => {
  const createId = ids();
  const noPass = finish(complete(seedEpisodeState(initialState(), "day-24"), ["Posso avere un buono?"], createId), createId);
  assert.equal(noPass.outcome?.id, "D24-O2");
  assert.equal(noPass.beachRemedy, "none");

  const paid = {
    ...seedEpisodeState(initialState(), "day-24"),
    beachDayPassPaid: true,
    beachDayPassPrice: 800,
    money: 520,
  };
  const refund = complete(paid, ["Vorrei un rimborso."], createId);
  assert.equal(refund.outcome?.id, "D24-O5");
  assert.equal(refund.money, 1320);
  assert.equal(refund.beachDayPassPaid, false);
});

test("parcel custody, invitation attendance, repair credit, and the new bus fare fail closed", () => {
  const createId = ids();

  const parcelExit = finish(respond(seedEpisodeState(initialState(), "day-23"), "Non è mio, grazie.", createId), createId);
  assert.equal(parcelExit.secondParcelStatus, "neighbor-held");
  assert.equal(parcelExit.worldEvents.includes("day23-second-parcel-collected"), false);

  const maybe = finish(respond(seedEpisodeState(initialState(), "day-25"), "Forse, non lo so ancora.", createId), createId);
  assert.equal(maybe.invitationResponse, "maybe");
  assert.equal(maybe.eventAttendance, "unknown");

  let ineligible: GameState = { ...seedEpisodeState(initialState(), "day-27"), hotWaterStatus: "fixed", repairCreditEligibility: "ineligible", repairCommitment: null, knownFacts: [] };
  const moneyBefore = ineligible.money;
  ineligible = respond(ineligible, "Ora funziona.", createId);
  ineligible = finish(respond(ineligible, "Posso avere un buono?", createId), createId);
  assert.equal(ineligible.outcome?.id, "D27-O2");
  assert.equal(ineligible.money, moneyBefore);
  assert.equal(ineligible.worldEvents.includes("day27-repair-credit-issued"), false);

  let bus = seedEpisodeState(initialState(), "day-28");
  const busBefore = bus.money;
  bus = complete(bus, ["Dove devo cambiare?", "Stallo tre alle nove e trentacinque.", "Pago due euro e quaranta."], createId);
  assert.equal(bus.money, busBefore - 240);
  assert.equal(bus.transportPlan?.id, "day-28-vietri-stand-3");
  assert.equal(bus.transportPlan?.stand, "3");
});

test("a pending Day 28 purchase survives hydration without a duplicate charge", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-28");
  game = respond(game, "Dove devo cambiare?", createId);
  game = respond(game, "Stallo tre alle nove e trentacinque.", createId);
  game = respond(game, "Pago due euro e quaranta.", createId);
  assert.equal(game.pendingOutcome, "D28-O1");
  assert.equal(game.money, 780);
  const restored = hydrateGameState(game);
  const resolved = finishPendingOutcome(restored, createId);
  assert.equal(resolved.money, 780);
  assert.equal(resolved.worldEvents.filter((event) => event === "day28-vietri-fare-paid").length, 1);
});

test("v1 through v5 saves migrate to bounded v6 defaults", () => {
  for (const schemaVersion of [1, 2, 3, 4, 5]) {
    const migrated = hydrateGameState({ schemaVersion, episodeId: "day-21", turnId: "e04_01_usual", status: "active" });
    assert.equal(migrated.schemaVersion, 6);
    assert.equal(migrated.guidance, null);
    assert.equal(migrated.seasonCompletion, null);
    assert.equal(migrated.secondParcelStatus, "none");
    assert.equal(migrated.eventAttendance, "unknown");
  }
});

test("the seven final Pocket Deck cards are exact reviewed phrases", () => {
  assert.equal(CORE_POCKET_DECK_CARDS.length, 30);
  const expected = new Map([
    ["what-do-you-recommend", "Cosa mi consiglia?"],
    ["can-get-credit", "Posso avere un buono?"],
    ["not-sure-yet", "Non lo so ancora."],
    ["quiet-table", "Preferirei un tavolo tranquillo."],
    ["everything-settled", "È tutto a posto?"],
    ["where-do-i-change", "Dove devo cambiare?"],
    ["leaving-tomorrow", "Parto domani."],
  ]);
  for (const [id, italian] of expected) {
    const card = CORE_POCKET_DECK_CARD_BY_ID.get(id);
    assert.ok(card);
    assert.equal(card.primaryItalian, italian);
    assert.equal(card.audioTranscript, italian);
  }
});
