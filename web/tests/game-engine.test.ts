import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import {
  applyResponse,
  finishPendingOutcome,
  nextEpisodeState,
  recordPhrasePractice,
  recordEpisodeRefresher,
  restartEpisodeState,
  seedEpisodeState,
  type HistoryIdFactory,
} from "../app/game/engine";
import {
  PHRASE_LESSONS,
  initialState,
  money,
  phraseExampleFor,
  type GameState,
} from "../app/game/model";
import { STORAGE_KEY } from "../app/game/model";
import { clearSavedGame, hydrateGameState, loadGame, parseSavedGame, saveGame, type LocalGameStorage } from "../app/game/persistence";
import { createSeasonEpisodeHandoff } from "../app/season/pocket-deck-handoff";
import { SEASON_01 } from "../app/season/manifest";
import { IMPLEMENTED_EPISODE_DEFINITIONS, OUTCOMES, SCENES, TURNS, sceneForEpisode } from "../app/season/registry";
import { scheduleSeason } from "../app/season/schedule";
import { createDefaultTripProfile } from "../app/trip/model";

function idFactory(): HistoryIdFactory { let next = 0; return () => `test-history-${++next}`; }
function respond(state: GameState, response: string, createId = idFactory()): GameState {
  const result = applyResponse(state, response, createId);
  assert.equal(result.kind, "advanced", `Expected ${JSON.stringify(response)} to advance`);
  return result.state;
}
function finish(state: GameState, ids: HistoryIdFactory): GameState { return finishPendingOutcome(state, ids); }

test("registers the exact 31-session current season", async () => {
  assert.equal(SEASON_01.length, 31);
  assert.equal(SEASON_01[0].id, "day-00");
  assert.equal(SEASON_01[30].id, "day-30");
  assert.deepEqual(SEASON_01.map((episode) => episode.id), Array.from({ length: 31 }, (_, day) => `day-${String(day).padStart(2, "0")}`));
  assert.deepEqual(SCENES.map((scene) => scene.episodeId), SEASON_01.map((episode) => episode.id));
  assert.deepEqual(IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.id), SEASON_01.map((episode) => episode.id));
  for (const episode of SEASON_01) {
    assert.ok(episode.location);
    assert.ok(episode.characterIds.length);
    assert.ok(episode.recurringLanguageTargets.length);
    assert.ok(episode.listeningChallenge);
    assert.ok(episode.contentVersion);
    assert.ok(episode.authoringStatus);
  }
  assert.equal(PHRASE_LESSONS.length, 24);
  for (const lesson of PHRASE_LESSONS) for (const scene of SCENES) assert.ok(phraseExampleFor(lesson.id, scene.id).italian);
  for (const turn of Object.values(TURNS)) {
    await access(new URL(`../public${turn.normal}`, import.meta.url));
    await access(new URL(`../public${turn.careful}`, import.meta.url));
  }
  assert.ok(Object.keys(TURNS).length > 130);
});

test("daily scheduling unlocks Day 0 immediately, then one durable session per countdown day", () => {
  const profile = { ...createDefaultTripProfile(new Date(2026, 7, 3, 12)), departureDate: "2026-09-02" };
  assert.equal(scheduleSeason(profile, [], "2026-07-01")[0].unlocked, true);
  assert.equal(scheduleSeason(profile, [], "2026-08-03")[1].unlocked, true);
  assert.equal(scheduleSeason(profile, [], "2026-08-03")[2].unlocked, false);
  assert.equal(scheduleSeason(profile, [], "2026-08-04")[2].unlocked, true);
  const missed = scheduleSeason(profile, [], "2026-08-10");
  assert.equal(missed.find((episode) => episode.id === "day-01")?.unlocked, true);
  assert.equal(missed.find((episode) => episode.id === "day-07")?.unlocked, true);
  assert.equal(scheduleSeason(profile, ["day-00", "day-01"], "2026-08-04").find((episode) => episode.playable && !episode.completed)?.id, "day-02");
  assert.equal(scheduleSeason(profile, [], "2026-07-01", true).every((episode) => episode.unlocked), true);
});

test("English fallback teaches without mutating the active episode", () => {
  const beach = seedEpisodeState(initialState(), "day-04");
  const before = structuredClone(beach);
  const result = applyResponse(beach, "I need one chair and one umbrella", idFactory());
  assert.equal(result.kind, "teaching");
  assert.equal(result.kind === "teaching" ? result.phraseId : null, "need");
  assert.deepEqual(result.state, before);
});

test("mixed Italian and English nouns remains valid play", () => {
  const result = applyResponse(seedEpisodeState(initialState(), "day-04"), "Mi servono one chair and one umbrella", idFactory());
  assert.equal(result.kind, "advanced");
  assert.equal(result.state.turnId, "e02_02_standard_offer");
});

test("toolkit use changes evidence only", () => {
  const beach = seedEpisodeState(initialState(), "day-04");
  const refreshed = recordPhrasePractice(beach, "need");
  assert.equal(refreshed.phrasePractice.need, 1);
  assert.equal(refreshed.money, beach.money);
  assert.equal(refreshed.turnId, beach.turnId);
});

test("beach quantity ambiguity is fail-closed and never silently buys two chairs", () => {
  const ids = idFactory();
  let beach = seedEpisodeState(initialState(), "day-04");
  beach = respond(beach, "Lettino e ombrellone", ids);
  beach = respond(beach, "Per oggi", ids);
  assert.equal(beach.turnId, "e02_03_quantity");
  assert.equal(beach.money, 8960);
  beach = respond(beach, "Un lettino, non due", ids);
  beach = respond(beach, "Sì, va bene. Con la carta.", ids);
  assert.equal(beach.pendingOutcome, "E2-O1");
  assert.equal(beach.money, 6760);
  beach = finish(beach, ids);
  assert.equal(beach.outcome?.id, "E2-O1");
});

test("Days 1 through 7 form a deterministic practical run ending at €51.10", () => {
  const ids = idFactory();
  let game = initialState();
  game = respond(game, "Ho una prenotazione a nome Fuscoletti", ids);
  game = respond(game, "Grazie. Camera dodici.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Sono Michael. Sono qui per la chiave.", ids);
  game = respond(game, "La porta verde, primo piano. Grazie.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Vorrei pane, formaggio e acqua.", ids);
  game = respond(game, "Solo questo, senza sacchetto.", ids);
  game = respond(game, "Pago con la carta.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Vorrei un espresso.", ids);
  game = respond(game, "Qui, grazie.", ids);
  game = respond(game, "Con la carta.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Mi servono un lettino e un ombrellone", ids);
  game = respond(game, "Un lettino, non due", ids);
  game = respond(game, "Sì, va bene. Con la carta.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Mezzo chilo di pomodori.", ids);
  game = respond(game, "Basta così, grazie.", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Un biglietto per Amalfi, per favore.", ids);
  game = respond(game, "Dov’è la fermata?", ids); game = finish(game, ids);
  game = nextEpisodeState(game);
  game = respond(game, "Mi serve qualcosa per le punture di zanzara.", ids);
  game = respond(game, "La crema, grazie.", ids); game = finish(game, ids);
  assert.equal(game.episodeId, "day-07");
  assert.equal(game.money, 5110);
  assert.equal(money(game.money), "€51.10");
  assert.deepEqual(game.completed, ["day-00", "day-01", "day-02", "day-03", "day-04", "day-05", "day-06", "day-07"]);
  assert.equal(game.inventory.includes("Mosquito-bite cream"), true);
  assert.equal(game.routeFact?.includes("across the square"), true);
});

test("v1 saves migrate by turn identity and v2 uses episode ID as authority", () => {
  const migrated = hydrateGameState({ sceneIndex: 1, turnId: "e02_03_quantity", status: "active", money: 7800, completed: ["hotel"] });
  assert.equal(migrated.episodeId, "day-04");
  assert.equal("sceneIndex" in migrated, false);
  assert.equal(migrated.turnId, "e02_03_quantity");
  assert.deepEqual(migrated.completed, ["day-00"]);
  const current = seedEpisodeState(initialState(), "day-13");
  assert.deepEqual(hydrateGameState(structuredClone(current)), current);
  const episodeWins = hydrateGameState({ ...current, episodeId: "day-06", sceneIndex: 0, turnId: "d06_01_destination" });
  assert.equal(episodeWins.episodeId, "day-06");
  assert.equal("sceneIndex" in episodeWins, false);
});

test("malformed cross-episode state recovers to a playable turn", () => {
  assert.deepEqual(parseSavedGame("not-json"), initialState());
  const cross = hydrateGameState({ schemaVersion: 2, episodeId: "day-04", turnId: "e04_01_usual", status: "resolved", outcome: OUTCOMES["E1-O1"] });
  assert.equal(cross.episodeId, "day-04");
  assert.equal(cross.turnId, sceneForEpisode("day-04")?.firstTurn);
  assert.equal(cross.status, "active");
  assert.equal(cross.outcome, null);
  const finalResolved = hydrateGameState({ ...seedEpisodeState(initialState(), "day-21"), status: "complete", outcome: OUTCOMES["E4-O1"] });
  assert.equal(finalResolved.status, "resolved");
  const malformed = hydrateGameState({ schemaVersion: 3, episodeId: "day-08", turnId: "fake", status: "active" });
  assert.equal(malformed.episodeId, "day-08");
  assert.equal(malformed.turnId, sceneForEpisode("day-08")?.firstTurn);
});

test("pending terminal reloads never duplicate a charge", () => {
  const ids = idFactory();
  let beach = seedEpisodeState(initialState(), "day-04");
  beach = respond(beach, "Mi servono un lettino e un ombrellone", ids);
  beach = respond(beach, "Un lettino, non due", ids);
  beach = respond(beach, "Sì, con la carta", ids);
  const restored = parseSavedGame(JSON.stringify(beach));
  const resolved = finish(restored, ids);
  const repeated = finish(resolved, ids);
  assert.equal(restored.money, 6760);
  assert.equal(repeated.money, 6760);
  assert.equal(repeated.outcome?.id, "E2-O1");
});

test("restart restores the authored pre-episode snapshot", () => {
  const ids = idFactory();
  let cafe = seedEpisodeState(initialState(), "day-13");
  cafe = respond(cafe, "Pago con la carta", ids);
  assert.equal(cafe.status, "resolved");
  const restarted = restartEpisodeState(cafe);
  assert.equal(restarted.episodeId, "day-13");
  assert.equal(restarted.turnId, "e03_01_present");
  assert.equal(restarted.money, 1610);
});

test("generic episode review evidence strengthens the mapped card idempotently", () => {
  const ids = idFactory();
  let apartment = seedEpisodeState(initialState(), "day-01");
  apartment = recordEpisodeRefresher(recordEpisodeRefresher(apartment, "opened"), "inserted");
  apartment = respond(apartment, "Sono Michael. Sono qui per la chiave.", ids);
  apartment = respond(apartment, "La porta verde, primo piano. Grazie.", ids);
  apartment = finish(apartment, ids);
  const evidence = createSeasonEpisodeHandoff(apartment);
  assert.ok(evidence);
  assert.equal(evidence.cardId, "apartment-key");
  assert.equal(evidence.episodeId, "day-01");
  assert.deepEqual(evidence.practicedMoves, ["identify", "request", "location", "confirm"]);
  assert.equal(evidence.refresherApplied, true);
  assert.equal(evidence.refresherMethod, "inserted");
  let replay = restartEpisodeState(apartment);
  replay = respond(replay, "Sono Michael. Sono qui per la chiave.", ids);
  replay = respond(replay, "La porta verde, primo piano. Grazie.", ids);
  replay = finish(replay, ids);
  const secondEvidence = createSeasonEpisodeHandoff(replay);
  assert.ok(secondEvidence);
  assert.equal(secondEvidence.attempt, 2);
  assert.notEqual(secondEvidence.id, evidence.id);
  assert.equal(secondEvidence.refresherApplied, false);
});

test("local persistence retains the existing key and reset behavior", () => {
  const values = new Map<string, string>();
  const storage: LocalGameStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const bus = seedEpisodeState(initialState(), "day-06");
  saveGame(storage, bus);
  assert.equal(values.has(STORAGE_KEY), true);
  assert.deepEqual(loadGame(storage), bus);
  clearSavedGame(storage);
  assert.deepEqual(loadGame(storage), initialState());
});
