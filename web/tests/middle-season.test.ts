import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponse,
  finishPendingOutcome,
  nextEpisodeState,
  seedEpisodeState,
  type HistoryIdFactory,
} from "../app/game/engine";
import { initialState, type GameState } from "../app/game/model";
import { hydrateGameState } from "../app/game/persistence";
import { CORE_POCKET_DECK_CARD_BY_ID } from "../app/pocket-deck/catalog";

function ids(): HistoryIdFactory {
  let index = 0;
  return () => `middle-${++index}`;
}

function respond(state: GameState, response: string, createId: HistoryIdFactory): GameState {
  const result = applyResponse(state, response, createId);
  assert.equal(result.kind, "advanced", `Expected ${state.episodeId} response ${JSON.stringify(response)} to advance`);
  return result.state;
}

function finish(state: GameState, createId: HistoryIdFactory): GameState {
  return state.pendingOutcome ? finishPendingOutcome(state, createId) : state;
}

function complete(state: GameState, responses: readonly string[], createId: HistoryIdFactory): GameState {
  for (const response of responses) state = respond(state, response, createId);
  state = finish(state, createId);
  assert.equal(state.status, "resolved", `${state.episodeId} should resolve`);
  assert.ok(state.money >= 0, `${state.episodeId} cannot create a negative balance`);
  return state;
}

const MIDDLE_EPISODES = [
  "day-08", "day-09", "day-10", "day-11", "day-12", "day-14",
  "day-15", "day-16", "day-17", "day-18", "day-19", "day-20",
] as const;

test("every new middle-season episode has a clean early exit with no negative balance", () => {
  const createId = ids();
  for (const episodeId of MIDDLE_EPISODES) {
    const seeded = seedEpisodeState(initialState(), episodeId);
    const exited = finish(respond(seeded, "Basta.", createId), createId);
    assert.equal(exited.status, "resolved", `${episodeId} exit should resolve`);
    assert.ok(exited.money >= 0, `${episodeId} exit cannot overcharge`);
  }
});

test("Days 8 through 21 form one canonical world-state run ending at €9.20", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-08");
  const route: readonly [string, readonly string[]][] = [
    ["day-08", ["Come funziona?", "Macchina quattro, gettoniera due.", "Premo il pulsante verde."]],
    ["day-09", ["Quanto tempo ci vuole?", "Prendo il traghetto."]],
    ["day-10", ["Pasta al pomodoro con insalata.", "Non patate, insalata."]],
    ["day-11", ["Non c'è acqua calda.", "Da stamattina.", "Martedì dalle nove alle undici va bene."]],
    ["day-12", ["C'è un'alternativa?", "Prendo l'ombra da otto euro."]],
    ["day-13", ["Ci sono due problemi: cappuccino e spremuta.", "Va bene, grazie.", "Pago con la carta."]],
    ["day-14", ["Dov'è la fermata provvisoria?", "Piazza Alta davanti alla farmacia, giusto."]],
    ["day-15", ["Non ho chiesto la borsa extra.", "Quattro euro, pago con la carta."]],
    ["day-16", ["Non ho il documento, ho il codice.", "4172."]],
    ["day-17", ["Aveva detto martedì mattina.", "Oggi alle diciotto va bene."]],
    ["day-18", ["C'è un'alternativa?", "Prendo il gel da sei euro."]],
    ["day-19", ["Vorrei il rimborso e l'autobus sostitutivo.", "Confermo l'autobus."]],
    ["day-20", ["È una soluzione temporanea?", "Venerdì alle dieci va bene."]],
    ["day-21", ["Il solito, grazie.", "Con la carta."]],
  ];

  for (const [episodeId, responses] of route) {
    assert.equal(game.episodeId, episodeId);
    game = complete(game, responses, createId);
    if (episodeId !== "day-21") game = nextEpisodeState(game);
  }

  assert.equal(game.money, 920);
  assert.equal(game.transportStatus, "replacement-bus");
  assert.equal(game.hotWaterStatus, "temporary");
  assert.deepEqual(game.repairCommitment, { window: "Friday at 10:00", status: "active" });
  assert.equal(game.parcelStatus, "collected");
  assert.equal(game.completed.length, 22);
});

test("asking the Day 9 ferry price does not purchase a ticket", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-09");
  const startingMoney = game.money;
  game = respond(game, "Quanto tempo ci vuole?", createId);
  assert.equal(game.turnId, "d09_02_options");

  game = respond(game, "Quanto costa il traghetto?", createId);
  assert.equal(game.status, "active");
  assert.equal(game.turnId, "d09_02_options");
  assert.equal(game.money, startingMoney);
  assert.equal(game.transportStatus, "none");
  assert.match(game.guidance ?? "", /Nothing has been booked/);

  game = finish(respond(game, "Prendo il traghetto delle nove e trenta.", createId), createId);
  assert.equal(game.outcome?.id, "D09-O1");
  assert.equal(game.money, startingMoney - 1000);
});

test("a cancellation cannot refund a ferry ticket the world does not own", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-19");
  game = {
    ...game,
    transportMode: "none",
    transportStatus: "none",
    transportTicketPrice: 0,
    turnId: "d19_01_no_ticket",
  };
  assert.equal(game.turnId, "d19_01_no_ticket");
  const before = game.money;
  game = respond(game, "Vorrei un rimborso.", createId);
  assert.equal(game.money, before);
  assert.equal(game.turnId, "d19_01_no_ticket");
  game = finish(respond(game, "Prendo l'autobus.", createId), createId);
  assert.equal(game.outcome?.id, "D19-O4");
  assert.equal(game.money, before - 240);
});

test("Day 21 chooses only a truthful callback from saved transport state", () => {
  const createId = ids();
  const cases = [
    ["replacement-bus", "e04_03_callback"],
    ["rebooked", "e04_03_rebooked"],
    ["refunded", "e04_03_refunded"],
    ["none", "e04_03_neutral"],
  ] as const;
  for (const [transportStatus, expectedTurn] of cases) {
    const game = respond({ ...seedEpisodeState(initialState(), "day-21"), transportStatus }, "Il solito, grazie.", createId);
    assert.equal(game.turnId, expectedTurn);
  }
});

test("English requests open authored refreshers without mutating the conversation", () => {
  const createId = ids();
  for (const [episodeId, english, phraseId] of [
    ["day-08", "How does this work?", "how"],
    ["day-11", "There is a problem with the hot water.", "problem"],
    ["day-12", "Is there an alternative?", "alternative"],
    ["day-17", "You said this morning.", "past_commitment"],
  ] as const) {
    const before = seedEpisodeState(initialState(), episodeId);
    const result = applyResponse(before, english, createId);
    assert.equal(result.kind, "teaching");
    assert.equal(result.kind === "teaching" ? result.phraseId : null, phraseId);
    assert.deepEqual(result.state, before);
  }
});

test("v3 saves gain bounded v6 world defaults and malformed legacy fields fail closed", () => {
  const migrated = hydrateGameState({ schemaVersion: 3, episodeId: "day-08", turnId: "d08_01_help", status: "active" });
  assert.equal(migrated.schemaVersion, 6);
  assert.equal(migrated.transportStatus, "none");
  assert.equal(migrated.hotWaterStatus, "unknown");
  const repaired = hydrateGameState({
    ...migrated,
    schemaVersion: 6,
    money: -500,
    transportStatus: "free-refund",
    transportTicketPrice: -1000,
    repairCommitment: { window: "", status: "invented" },
  });
  assert.equal(repaired.money, 0);
  assert.equal(repaired.transportStatus, "none");
  assert.equal(repaired.transportTicketPrice, 0);
  assert.equal(repaired.repairCommitment, null);
});

test("the eight new Pocket Deck cards are exact authored resources", () => {
  const expected = new Map([
    ["how-does-it-work", "Come funziona?"],
    ["how-long-does-it-take", "Quanto tempo ci vuole?"],
    ["no-hot-water", "Non c’è acqua calda."],
    ["is-there-an-alternative", "C’è un’alternativa?"],
    ["temporary-stop", "Dov’è la fermata provvisoria?"],
    ["missing-document", "Non ho il documento con me."],
    ["you-said-this-morning", "Aveva detto stamattina."],
    ["refund-please", "Vorrei un rimborso, per favore."],
  ]);
  for (const [cardId, transcript] of expected) {
    const card = CORE_POCKET_DECK_CARD_BY_ID.get(cardId);
    assert.ok(card, `${cardId} must exist`);
    assert.equal(card.primaryItalian, transcript);
    assert.equal(card.audioTranscript, transcript);
  }
});
