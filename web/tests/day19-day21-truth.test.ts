import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponse,
  finishPendingOutcome,
  seedEpisodeState,
  type HistoryIdFactory,
} from "../app/game/engine";
import { initialState, type GameState } from "../app/game/model";
import { hydrateGameState, parseSavedGame } from "../app/game/persistence";
import { createSeasonEpisodeHandoff } from "../app/season/pocket-deck-handoff";

function ids(prefix: string): HistoryIdFactory {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

function respond(state: GameState, response: string, createId: HistoryIdFactory): GameState {
  const result = applyResponse(state, response, createId);
  assert.equal(result.kind, "advanced", `Expected ${JSON.stringify(response)} to advance`);
  return result.state;
}

function finishThroughReload(state: GameState, createId: HistoryIdFactory): GameState {
  assert.ok(state.pendingOutcome, "Expected a pending terminal outcome before reload");
  const restored = parseSavedGame(JSON.stringify(state));
  assert.equal(restored.pendingOutcome, state.pendingOutcome);
  assert.equal(restored.money, state.money);
  const resolved = finishPendingOutcome(restored, createId);
  const repeated = finishPendingOutcome(resolved, createId);
  assert.equal(repeated.money, resolved.money);
  assert.equal(repeated.outcome?.id, resolved.outcome?.id);
  assert.deepEqual(repeated.episodeResults, resolved.episodeResults);
  return resolved;
}

function day19State(ownsTicket: boolean, money = 2000): GameState {
  const seeded = seedEpisodeState(initialState(), "day-19");
  return {
    ...seeded,
    money,
    transportMode: ownsTicket ? "ferry" : "none",
    transportStatus: ownsTicket ? "booked" : "none",
    transportTicketPrice: ownsTicket ? 1000 : 0,
    ferryMemory: ownsTicket ? "Ferry ticket owned for 09:30" : null,
    inventory: ownsTicket ? ["Ferry ticket"] : [],
    knownFacts: [],
    turnId: ownsTicket ? "d19_01_ticket" : "d19_01_no_ticket",
  };
}

test("Day 19 owned-ticket refund, rebooking, and replacement bus remain distinct and idempotent", () => {
  const createId = ids("d19-owned");

  const refundStart = day19State(true);
  const refund = finishThroughReload(respond(refundStart, "Vorrei un rimborso.", createId), createId);
  assert.equal(refund.outcome?.id, "D19-O2");
  assert.equal(refund.money - refundStart.money, 1000);
  assert.equal(refund.transportMode, "none");
  assert.equal(refund.transportStatus, "refunded");
  assert.equal(refund.outcome?.detail, "The owned ticket was refunded and the outing was cancelled.");
  assert.equal(refund.outcome?.consequence, "+€10.00 · no new ticket");

  const rebookStart = day19State(true);
  const rebook = finishThroughReload(respond(rebookStart, "Riprenoto il traghetto delle quindici e trenta.", createId), createId);
  assert.equal(rebook.outcome?.id, "D19-O3");
  assert.equal(rebook.money - rebookStart.money, 0);
  assert.equal(rebook.transportMode, "ferry");
  assert.equal(rebook.transportStatus, "rebooked");
  assert.equal(rebook.transportTicketPrice, 1000);
  assert.equal(rebook.outcome?.detail, "The owned ticket moved to the 15:30 ferry.");
  assert.equal(rebook.outcome?.consequence, "No charge · ferry 15:30");

  const busStart = day19State(true);
  let busPending = respond(busStart, "Vorrei il rimborso e l'autobus sostitutivo.", createId);
  assert.equal(busPending.turnId, "d19_02_bus");
  assert.equal(busPending.money, busStart.money);
  busPending = respond(busPending, "Confermo l'autobus.", createId);
  const bus = finishThroughReload(busPending, createId);
  assert.equal(bus.outcome?.id, "D19-O1");
  assert.equal(bus.money - busStart.money, 760);
  assert.equal(bus.transportMode, "bus");
  assert.equal(bus.transportStatus, "replacement-bus");
  assert.equal(bus.transportTicketPrice, 240);
  assert.equal(bus.outcome?.consequence, "+€7.60 net · replacement bus");
});

test("Day 19 no-ticket choices never reuse an owned-ticket outcome", () => {
  const createId = ids("d19-new");

  const refusalStart = day19State(false);
  const refusal = respond(refusalStart, "Vorrei un rimborso.", createId);
  assert.equal(refusal.status, "active");
  assert.equal(refusal.turnId, "d19_01_no_ticket");
  assert.equal(refusal.money, refusalStart.money);
  assert.equal(refusal.pendingOutcome, null);

  const busStart = day19State(false);
  const bus = finishThroughReload(respond(busStart, "Prendo l'autobus.", createId), createId);
  assert.equal(bus.outcome?.id, "D19-O4");
  assert.equal(bus.money - busStart.money, -240);
  assert.equal(bus.transportMode, "bus");
  assert.equal(bus.transportStatus, "replacement-bus");
  assert.equal(bus.outcome?.consequence, "−€2.40 · no unearned refund");

  const ferryStart = day19State(false);
  const ferry = finishThroughReload(respond(ferryStart, "Compro il traghetto delle quindici e trenta.", createId), createId);
  assert.equal(ferry.outcome?.id, "D19-O7");
  assert.equal(ferry.money - ferryStart.money, -1000);
  assert.equal(ferry.transportMode, "ferry");
  assert.equal(ferry.transportStatus, "booked");
  assert.equal(ferry.transportTicketPrice, 1000);
  assert.match(ferry.inventory.join(" "), /Ferry ticket · 15:30/);
  assert.equal(ferry.outcome?.title, "New ferry ticket purchased");
  assert.equal(ferry.outcome?.detail, "No qualifying ferry ticket existed, so you bought a new ticket for the 15:30 ferry.");
  assert.equal(ferry.outcome?.consequence, "−€10.00 · new ferry ticket for 15:30");
  assert.doesNotMatch(`${ferry.outcome?.title} ${ferry.outcome?.detail} ${ferry.outcome?.consequence}`, /owned ticket moved|no charge/i);
});

test("Day 19 insufficient funds and exits are no-charge and fail closed", () => {
  const createId = ids("d19-closed");
  for (const [money, response] of [[100, "Prendo l'autobus."], [900, "Compro il traghetto."]] as const) {
    const start = day19State(false, money);
    const result = finishThroughReload(respond(start, response, createId), createId);
    assert.equal(result.outcome?.id, "D19-O6");
    assert.equal(result.money, money);
    assert.equal(result.transportMode, "none");
    assert.equal(result.transportStatus, "none");
    assert.equal(result.transportTicketPrice, 0);
    assert.equal(result.outcome?.consequence, "No charge · no ticket · no negative balance");
  }

  for (const ownsTicket of [true, false]) {
    const start = day19State(ownsTicket);
    const result = finishThroughReload(respond(start, "Basta.", createId), createId);
    assert.equal(result.outcome?.id, "D19-O5");
    assert.equal(result.money, start.money);
  }

  const offered = respond(day19State(true), "Rimborso e autobus.", createId);
  const abandoned = finishThroughReload(respond(offered, "Basta.", createId), createId);
  assert.equal(abandoned.outcome?.id, "D19-O5");
  assert.equal(abandoned.money, 2000);
});

type Day21Case = {
  name: string;
  status: GameState["transportStatus"] | "malformed";
  mode: GameState["transportMode"];
  memory: string | null;
  callbackTurn: string;
  compatibleResponse: string;
  incompatibleResponse: string;
  accountTurn: string;
  accountOutcome: string;
  accountFact: string | null;
};

const DAY_21_CASES: readonly Day21Case[] = [
  { name: "replacement bus", status: "replacement-bus", mode: "bus", memory: "Ferry cancelled; €10 refunded; replacement bus taken", callbackTurn: "e04_03_callback", compatibleResponse: "Il traghetto è stato cancellato e ho preso l'autobus.", incompatibleResponse: "Ho riprenotato il traghetto.", accountTurn: "e04_05_account_pay", accountOutcome: "E4-O3", accountFact: "Giulia heard: ferry cancelled; replacement bus taken" },
  { name: "rebooked", status: "rebooked", mode: "ferry", memory: "Ferry cancelled; rebooked for 15:30", callbackTurn: "e04_03_rebooked", compatibleResponse: "Ho riprenotato il traghetto alle quindici e trenta.", incompatibleResponse: "Ho preso l'autobus.", accountTurn: "e04_05_rebooked_pay", accountOutcome: "E4-O5", accountFact: "Giulia heard: cancelled ferry rebooked for 15:30" },
  { name: "refunded", status: "refunded", mode: "none", memory: "Ferry cancelled; ticket refunded; outing cancelled", callbackTurn: "e04_03_refunded", compatibleResponse: "Sì, ho ricevuto il rimborso.", incompatibleResponse: "Ho preso l'autobus.", accountTurn: "e04_05_refunded_pay", accountOutcome: "E4-O6", accountFact: "Giulia heard: cancelled ferry ticket refunded" },
  { name: "cancelled", status: "cancelled", mode: "ferry", memory: "Ferry cancelled; no recovery selected", callbackTurn: "e04_03_cancelled", compatibleResponse: "Il traghetto è stato cancellato e ho rinunciato alla gita.", incompatibleResponse: "Ho ricevuto il rimborso.", accountTurn: "e04_05_cancelled_pay", accountOutcome: "E4-O7", accountFact: "Giulia heard: outing ended after ferry cancellation" },
  { name: "none", status: "none", mode: "none", memory: null, callbackTurn: "e04_03_neutral", compatibleResponse: "Il viaggio sta andando bene.", incompatibleResponse: "Ho preso l'autobus dopo la cancellazione.", accountTurn: "e04_08_neutral_pay", accountOutcome: "E4-O8", accountFact: null },
  { name: "malformed", status: "malformed", mode: "none", memory: null, callbackTurn: "e04_03_neutral", compatibleResponse: "Il viaggio sta andando bene.", incompatibleResponse: "Ho ricevuto il rimborso.", accountTurn: "e04_08_neutral_pay", accountOutcome: "E4-O8", accountFact: null },
];

function day21State(scenario: Day21Case): GameState {
  const seeded = {
    ...seedEpisodeState(initialState(), "day-21"),
    money: 2000,
    transportMode: scenario.mode,
    transportStatus: scenario.status === "malformed" ? "none" as const : scenario.status,
    transportTicketPrice: scenario.status === "replacement-bus" ? 240 : scenario.status === "none" || scenario.status === "malformed" || scenario.status === "refunded" || scenario.status === "cancelled" ? 0 : 1000,
    ferryMemory: scenario.memory,
    knownFacts: [],
  };
  if (scenario.status !== "malformed") return seeded;
  return hydrateGameState({ ...seeded, transportMode: "airship", transportStatus: "invented" });
}

function openDay21Callback(scenario: Day21Case, createId: HistoryIdFactory): GameState {
  const callback = respond(day21State(scenario), "Il solito, grazie.", createId);
  assert.equal(callback.turnId, scenario.callbackTurn, `${scenario.name} callback`);
  return callback;
}

function finishDay21(state: GameState, createId: HistoryIdFactory): GameState {
  return finishThroughReload(respond(state, "Con la carta.", createId), createId);
}

test("Day 21 callback variants keep immediate pay, boundary, question, and exit outcomes neutral", () => {
  const createId = ids("d21-neutral");
  for (const scenario of DAY_21_CASES) {
    const start = day21State(scenario);

    const immediate = finishDay21(openDay21Callback(scenario, createId), createId);
    assert.equal(immediate.outcome?.id, "E4-O1", `${scenario.name} immediate outcome`);
    assert.equal(immediate.money, start.money - 200);
    assert.equal(immediate.ferryMemory, scenario.memory);
    assert.deepEqual(immediate.knownFacts, []);
    assert.doesNotMatch(JSON.stringify(immediate.outcome), /refund|rebook|replacement bus/i);

    let boundary = respond(openDay21Callback(scenario, createId), "Te lo racconto un'altra volta.", createId);
    assert.equal(boundary.turnId, "e04_04_boundary_pay");
    boundary = finishDay21(boundary, createId);
    assert.equal(boundary.outcome?.id, "E4-O2");
    assert.equal(boundary.money, start.money - 200);
    assert.equal(boundary.ferryMemory, scenario.memory);
    assert.deepEqual(boundary.knownFacts, []);

    let question = respond(openDay21Callback(scenario, createId), "E tu, come stai?", createId);
    assert.equal(question.turnId, "e04_06_followup");
    question = finishDay21(question, createId);
    assert.equal(question.outcome?.id, "E4-O9");
    assert.equal(question.money, start.money - 200);
    assert.equal(question.ferryMemory, scenario.memory);
    assert.deepEqual(question.knownFacts, []);
    assert.doesNotMatch(JSON.stringify(question.outcome), /ferry|traghetto|cancel|refund|rebook|bus/i);
    assert.equal(question.episodeResults["day-21"]?.[0].observedMoves.includes("recovery"), false);
    assert.equal(createSeasonEpisodeHandoff(question)?.practicedMoves.includes("recovery"), false);

    const exited = finishThroughReload(respond(openDay21Callback(scenario, createId), "Basta.", createId), createId);
    assert.equal(exited.outcome?.id, "E4-O4");
    assert.equal(exited.money, start.money);
    assert.equal(exited.ferryMemory, scenario.memory);
    assert.deepEqual(exited.knownFacts, []);
  }
});

test("Day 21 records only callback-compatible factual accounts", () => {
  const createId = ids("d21-account");
  for (const scenario of DAY_21_CASES) {
    const start = day21State(scenario);
    let account = respond(openDay21Callback(scenario, createId), scenario.compatibleResponse, createId);
    assert.equal(account.turnId, scenario.accountTurn, `${scenario.name} account turn`);
    account = finishDay21(account, createId);
    assert.equal(account.outcome?.id, scenario.accountOutcome, `${scenario.name} account outcome`);
    assert.equal(account.money, start.money - 200);
    assert.equal(account.ferryMemory, scenario.memory);
    assert.deepEqual(account.knownFacts, scenario.accountFact ? [scenario.accountFact] : []);
    const hasRecovery = account.episodeResults["day-21"]?.[0].observedMoves.includes("recovery") ?? false;
    assert.equal(hasRecovery, scenario.accountFact !== null);
    assert.equal(createSeasonEpisodeHandoff(account)?.practicedMoves.includes("recovery") ?? false, scenario.accountFact !== null);

    const callback = openDay21Callback(scenario, createId);
    const incompatible = respond(callback, scenario.incompatibleResponse, createId);
    assert.equal(incompatible.status, "active");
    assert.equal(incompatible.turnId, scenario.callbackTurn);
    assert.equal(incompatible.money, callback.money);
    assert.deepEqual(incompatible.knownFacts, []);
    assert.equal(incompatible.observedMoves.includes("recovery"), false);
    const paid = finishDay21(incompatible, createId);
    assert.equal(paid.outcome?.id, "E4-O1");
    assert.deepEqual(paid.knownFacts, []);
  }
});

test("the exact neutral Day 21 question path cannot invent a transport account", () => {
  const createId = ids("d21-repro");
  const scenario = DAY_21_CASES.find((candidate) => candidate.name === "none")!;
  let game = openDay21Callback(scenario, createId);
  game = respond(game, "E tu, come stai?", createId);
  game = finishDay21(game, createId);
  assert.equal(game.outcome?.id, "E4-O9");
  assert.equal(game.outcome?.title, "The question returned");
  assert.equal(game.outcome?.detail, "You asked how Giulia was and kept the exchange focused on her answer.");
  assert.equal(game.outcome?.consequence, "−€2.00 · no transport story added");
  assert.equal(game.money, 1800);
  assert.equal(game.ferryMemory, null);
  assert.deepEqual(game.knownFacts, []);
  assert.doesNotMatch(JSON.stringify([game.outcome, game.ferryMemory, game.knownFacts]), /ferry|traghetto|cancel|refund|rebook|bus/i);
});
