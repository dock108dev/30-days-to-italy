import assert from "node:assert/strict";
import test from "node:test";

import {
  seedEpisodeState,
  submitEpisodeResponse,
  type HistoryIdFactory,
} from "../app/game/engine";
import { initialState, PLAYER_RESPONSE_MAX_LENGTH, type GameState } from "../app/game/model";

function ids(): HistoryIdFactory {
  let index = 0;
  return () => `interaction-${++index}`;
}

function submit(state: GameState, response: string, createId: HistoryIdFactory): GameState {
  const result = submitEpisodeResponse(state, response, createId);
  assert.equal(result.kind, "advanced");
  return result.state;
}

test("the shared interaction boundary commits terminal outcomes without an audio event", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-02");
  game = submit(game, "Vorrei pane, formaggio e acqua.", createId);
  game = submit(game, "Solo questo, senza sacchetto.", createId);
  game = submit(game, "Pago con la carta.", createId);

  assert.equal(game.status, "resolved");
  assert.equal(game.pendingOutcome, null);
  assert.equal(game.outcome?.id, "D02-O1");
  assert.equal(game.money, 9160);
  assert.deepEqual(game.inventory, ["Bread", "Cheese", "Water"]);
  assert.equal(game.episodeResults["day-02"]?.length, 1);

  const repeated = submit(game, "Pago con la carta.", createId);
  assert.strictEqual(repeated, game);
  assert.equal(repeated.money, 9160);
  assert.equal(repeated.episodeResults["day-02"]?.length, 1);
});

test("normal key handoffs keep key booleans and authoritative custody aligned", () => {
  const createId = ids();
  let hotel = seedEpisodeState(initialState(), "day-00");
  hotel = submit(hotel, "Fuscoletti. Ho una prenotazione.", createId);
  hotel = submit(hotel, "A che ora è la colazione?", createId);
  hotel = submit(hotel, "Finisce alle dieci, ho capito.", createId);
  assert.equal(hotel.outcome?.id, "E1-O1");
  assert.equal(hotel.hotelKey, true);
  assert.equal(hotel.keyCustody.hotel, "held");

  let apartment = seedEpisodeState(hotel, "day-01");
  apartment = submit(apartment, "Sono Michael. Sono qui per la chiave.", createId);
  apartment = submit(apartment, "La porta verde, primo piano. Grazie.", createId);
  assert.equal(apartment.outcome?.id, "D01-O1");
  assert.equal(apartment.apartmentKey, true);
  assert.equal(apartment.keyCustody.apartment, "held");
});

test("the shared boundary caps bypassed response input before evaluation and persistence", () => {
  const createId = ids();
  const oversized = `Fuscoletti. Ho una prenotazione. ${"x".repeat(5_000)}`;
  const game = submit(initialState(), oversized, createId);
  const playerEntry = game.history.findLast((entry) => entry.kind === "player");

  assert.equal(game.lastResponse.length, PLAYER_RESPONSE_MAX_LENGTH);
  assert.equal(playerEntry?.text.length, PLAYER_RESPONSE_MAX_LENGTH);
  assert.equal(game.lastResponse.startsWith("Fuscoletti. Ho una prenotazione."), true);
});

test("preparation actions preserve every authoritative field, reject stale pages and turns", async () => {
  const { preparationCursor, updatePreparation } = await import("../app/prototype/preparation");
  const start = initialState();
  const cursor = preparationCursor(start)!;
  const listen = updatePreparation(start, cursor, { page: "listen" });
  assert.equal(updatePreparation(listen, cursor, { page: "listen" }), listen);
  const heard = updatePreparation(listen, preparationCursor(listen)!, { audio: "careful" });
  const { preparation, ...rest } = heard;
  assert.deepEqual(rest, start);
  assert.equal(preparation?.audioAttempts.e01_01_name.careful, 1);
  assert.deepEqual(preparation?.traversedSegmentIds, []);
  assert.deepEqual(preparation?.visitedExampleIds, []);
  const later = submit(listen, "Fuscoletti", ids());
  assert.equal(later.hotelKey, true);
  assert.equal(updatePreparation(later, preparationCursor(listen)!, { audio: "normal" }), later);
  const brief = updatePreparation(later, preparationCursor(later)!, { initialize: true });
  const { preparation: ignored, ...after } = brief;
  void ignored;
  const { preparation: prior, ...before } = later;
  void prior;
  assert.deepEqual(after, before);
});

test("T3 full entry guards, explicit traversal, reload, detour and replay preserve evidence boundaries", async () => {
  const { preparationCursor, preparationFor, updatePreparation, openPreparationReview } = await import("../app/prototype/preparation");
  const { hydrateGameState } = await import("../app/game/persistence");
  const { restartEpisodeState } = await import("../app/game/engine");
  const { createSeasonEpisodeHandoff } = await import("../app/season/pocket-deck-handoff");
  for (const day of ["day-00", "day-01"] as const) {
    let game = seedEpisodeState(initialState(), day);
    const { preparation: initialPreparation, ...before } = structuredClone(game);
    void initialPreparation;
    const action = (a: Parameters<typeof updatePreparation>[2]) => { game = updatePreparation(game, preparationCursor(game)!, a); };
    action({ page: "listen" });
    action({ audio: "normal" });
    action({ page: "pattern" });
    assert.deepEqual(game.preparation?.visitedExampleIds, []);
    game = hydrateGameState(JSON.parse(JSON.stringify(game)));
    assert.equal(preparationFor(game)?.activity.page, "pattern");
    const oldCursor = preparationCursor(game)!;
    action({ continue: true });
    assert.equal(game.preparation?.visitedExampleIds.length, 1);
    assert.equal(game.preparation?.traversedSegmentIds.length, 0);
    assert.strictEqual(updatePreparation(game, oldCursor, { continue: true }), game);
    game = hydrateGameState(game);
    assert.equal(preparationFor(game)?.activity.page, "handoff");
    action({ continue: true });
    assert.equal(preparationCursor(game), null);
    assert.equal(preparationCursor(hydrateGameState(game)), null);
    assert.equal(game.preparation?.traversedSegmentIds.length, 1);
    const { preparation, ...rest } = game;
    void preparation;
    assert.deepEqual(rest, before);
    assert.equal(createSeasonEpisodeHandoff(game), null);
    const live = game;
    game = openPreparationReview(game);
    assert.equal(preparationFor(game)?.activity.mode, "reviewing");
    game = hydrateGameState(game);
    assert.equal(preparationFor(game)?.activity.mode, "reviewing");
    action({ return: true });
    assert.equal(preparationCursor(game), null);
    assert.deepEqual(game.preparation?.traversedSegmentIds, live.preparation?.traversedSegmentIds);
    const detour = openPreparationReview(game);
    const stale = preparationCursor(detour)!;
    game = submitEpisodeResponse(detour, day === "day-00" ? "Fuscoletti" : "Sono Michael. Sono qui per la chiave.").state;
    assert.strictEqual(updatePreparation(game, stale, { return: true }), game);
    assert.equal(preparationFor(game)?.activity.page, "turn-brief");
    const key = game.keyCustody;
    action({ continue: true });
    assert.deepEqual(game.keyCustody, key);
    assert.equal(preparationCursor(game), null);
    game = submitEpisodeResponse(game, "grazie").state;
    assert.equal(preparationCursor(game), null, "same-turn retry does not repeat brief");
    game = submitEpisodeResponse(game, "Ho capito").state;
    assert.equal(game.status, "resolved");
    const summary = structuredClone(game.episodeResults[day]![0].preparation);
    assert.equal(summary?.traversedSegmentIds.length, 2);
    assert.equal(summary?.visitedExampleIds.length, 2);
    assert.equal(Object.keys(summary!).includes("page"), false);
    game = openPreparationReview(game);
    action({ page: "listen" });
    action({ audio: "careful" });
    assert.deepEqual(game.episodeResults[day]![0].preparation, summary);
    game = hydrateGameState(game);
    assert.equal(preparationFor(game)?.activity.mode, "reviewing");
    action({ return: true });
    assert.equal(preparationCursor(game), null);
    assert.deepEqual(game.episodeResults[day]![0].preparation, summary);
    const replay = restartEpisodeState(game);
    assert.equal(replay.preparation, undefined);
    assert.deepEqual(replay.episodeResults, game.episodeResults);
    assert.deepEqual(replay.seasonCompletion, game.seasonCompletion);
    assert.equal(preparationFor(replay)?.activity.page, "situation");
  }
});

test("T3 old page callbacks cannot act after a round trip, malformed gates cannot unlock", async () => {
  const { preparationCursor, preparationFor, updatePreparation } = await import("../app/prototype/preparation");
  let game = initialState();
  const stale = preparationCursor(game)!;
  game = updatePreparation(game, stale, { page: "listen" });
  game = updatePreparation(game, preparationCursor(game)!, { page: "situation" });
  assert.strictEqual(updatePreparation(game, stale, { page: "listen" }), game);
  const unsafe = { ...game, preparation: { ...game.preparation!, mode: "encounter" as const, page: "handoff" as const, traversedSegmentIds: [game.turnId], visitedExampleIds: [] } };
  assert.equal(preparationFor(unsafe)?.activity.page, "pattern");
  const changed = { ...unsafe, preparation: { ...unsafe.preparation!, contentVersion: "older" } };
  assert.equal(preparationFor(changed)?.activity.page, "situation");
});
