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
  hotel = submit(hotel, "Può ripetere?", createId);
  hotel = submit(hotel, "Grazie.", createId);
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
