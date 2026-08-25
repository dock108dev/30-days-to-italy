import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyResponse,
  createEpisodeCoordinator,
  finishPendingOutcome,
  restartEpisodeState,
  seedEpisodeState,
  type HistoryIdFactory,
} from "../app/game/engine";
import { hydrateGameState } from "../app/game/persistence";
import { initialState, type GameState } from "../app/game/model";
import { ADMIN_FAST_TRACK_CHECKPOINTS } from "../app/admin/fast-track";
import { SEASON_01, seasonEpisode } from "../app/season/manifest";
import {
  IMPLEMENTED_EPISODE_DEFINITIONS,
  OUTCOMES,
  SCENES,
  TURNS,
} from "../app/season/registry";
import {
  authoredTurn,
  buildObservedEpisodeResult,
  isAcceptedTransition,
  noObservation,
  observation,
  type EpisodeDefinition,
} from "../app/season/types";
import { createSeasonEpisodeHandoff } from "../app/season/pocket-deck-handoff";

function ids(): HistoryIdFactory {
  let index = 0;
  return () => `architecture-${++index}`;
}

function respond(state: GameState, response: string, createId: HistoryIdFactory): GameState {
  const result = applyResponse(state, response, createId);
  assert.equal(result.kind, "advanced");
  return result.state;
}

test("every current episode owns reviewed content, rules, observations, and an Admin seed", () => {
  assert.equal(SEASON_01.length, 31);
  assert.equal(new Set(SEASON_01.map((episode) => episode.id)).size, 31);
  assert.equal(IMPLEMENTED_EPISODE_DEFINITIONS.length, 31);
  for (const definition of IMPLEMENTED_EPISODE_DEFINITIONS) {
    assert.equal(definition.authoringStatus, "reviewed");
    assert.match(definition.contentVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(definition.scene.episodeId, definition.id);
    assert.ok(definition.turns[definition.scene.firstTurn]);
    assert.ok(Object.keys(definition.turns).length);
    assert.ok(Object.keys(definition.outcomes).length);
    assert.equal(typeof definition.evaluateResponse, "function");
    assert.equal(typeof definition.observeResponse, "function");
    assert.equal(typeof definition.adminSeed, "function");
    assert.equal(typeof definition.buildResult, "function");
  }
});

test("derived scene, turn, and outcome catalogs exactly match registered definitions", () => {
  assert.deepEqual(SCENES, IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.scene));
  assert.equal(
    Object.keys(TURNS).length,
    IMPLEMENTED_EPISODE_DEFINITIONS.reduce((count, definition) => count + Object.keys(definition.turns).length, 0),
  );
  assert.equal(
    Object.keys(OUTCOMES).length,
    IMPLEMENTED_EPISODE_DEFINITIONS.reduce((count, definition) => count + Object.keys(definition.outcomes).length, 0),
  );
});

test("the runtime coordinator has no positional progression or episode branches", async () => {
  const source = await readFile(new URL("../app/game/engine.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /sceneIndex/);
  assert.doesNotMatch(source, /handleApartment|handleBus|handlePharmacy|EPISODE_HANDLERS/);
  assert.equal("sceneIndex" in initialState(), false);
});

test("a fixture definition executes through the generic coordinator without an engine branch", () => {
  const metadata = seasonEpisode("day-08");
  const fixture: EpisodeDefinition = {
    ...metadata,
    sceneId: "hotel",
    scene: { id: "hotel", episodeId: "day-08", day: "Day 8", dateLabel: "Fixture", title: "Fixture", location: "Test counter", time: "12:00", npc: "Tester", role: "Fixture", objective: "Advance once.", firstTurn: "fixture-start", kicker: "Architecture only.", suggestions: [] },
    turns: {
      "fixture-start": authoredTurn("fixture-start", "Tester", "Proceda.", "Advance."),
      "fixture-next": authoredTurn("fixture-next", "Tester", "Fatto.", "Done."),
    },
    outcomes: { "FIX-O1": { id: "FIX-O1", title: "Fixture", detail: "Fixture", consequence: "None", tone: "success" } },
    terminalOutcomeTurns: {},
    evaluateResponse({ state, createId, runtime }) {
      return runtime.moveToTurn(state, "fixture-next", {}, undefined, createId);
    },
    observeResponse({ before, after }) {
      return isAcceptedTransition(before, after) ? observation(["request"]) : noObservation();
    },
    adminSeed: () => ({}),
    buildResult: buildObservedEpisodeResult,
  };
  const state = { ...initialState(), episodeId: "day-08" as const, turnId: "fixture-start" };
  const fixtureRegistry = createEpisodeCoordinator([fixture]);
  const result = fixtureRegistry.applyResponse(state, "Avanti", ids());
  assert.equal(result.kind, "advanced");
  assert.equal(result.state.turnId, "fixture-next");
  assert.deepEqual(result.state.observedMoves, ["request"]);
});

test("Admin checkpoints and canonical seeds come from registered episodes", () => {
  assert.deepEqual(
    ADMIN_FAST_TRACK_CHECKPOINTS.filter((checkpoint) => checkpoint.mode === "prepare").map((checkpoint) => checkpoint.episodeId),
    IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.id),
  );
  for (const definition of IMPLEMENTED_EPISODE_DEFINITIONS) {
    const seeded = seedEpisodeState(initialState(), definition.id);
    assert.equal(seeded.episodeId, definition.id);
    assert.equal(seeded.turnId, definition.scene.firstTurn);
    for (const [key, value] of Object.entries(definition.adminSeed())) {
      assert.deepEqual(seeded[key as keyof GameState], value);
    }
  }
});

test("Day 21 resolves normally and malformed complete state cannot complete the season", () => {
  const createId = ids();
  let game = seedEpisodeState(initialState(), "day-21");
  game = respond(game, "Il solito, grazie.", createId);
  game = respond(game, "Con la carta.", createId);
  game = finishPendingOutcome(game, createId);
  assert.equal(game.status, "resolved");
  assert.equal(game.completed.includes("day-21"), true);
  const repaired = hydrateGameState({ ...game, schemaVersion: 2, status: "complete" });
  assert.equal(repaired.status, "resolved");
});

test("early exit and partial attempts carry only observed moves", () => {
  const createId = ids();
  let exit = seedEpisodeState(initialState(), "day-01");
  exit = respond(exit, "Esco, grazie.", createId);
  assert.deepEqual(exit.episodeResults["day-01"]?.[0]?.observedMoves, []);
  assert.equal(createSeasonEpisodeHandoff(exit), null);

  let partial = seedEpisodeState(initialState(), "day-01");
  partial = respond(partial, "Sono Michael. Sono qui per la chiave.", createId);
  partial = respond(partial, "Devo andare.", createId);
  partial = finishPendingOutcome(partial, createId);
  const handoff = createSeasonEpisodeHandoff(partial);
  assert.ok(handoff);
  assert.deepEqual(handoff.practicedMoves, ["identify", "request", "boundary"]);
  assert.equal(handoff.practicedMoves.includes("location"), false);
});

test("latest attempt is selected explicitly and explicit facts do not leak from targets", () => {
  const createId = ids();
  let first = seedEpisodeState(initialState(), "day-01");
  first = respond(first, "Sono Michael. Sono qui per la chiave.", createId);
  first = respond(first, "Porta verde, primo piano.", createId);
  first = finishPendingOutcome(first, createId);
  let second = restartEpisodeState(first);
  second = respond(second, "Sono Michael. Sono qui per la chiave.", createId);
  second = respond(second, "Devo andare.", createId);
  second = finishPendingOutcome(second, createId);
  second = {
    ...second,
    episodeResults: {
      ...second.episodeResults,
      "day-01": [...(second.episodeResults["day-01"] ?? [])].reverse(),
    },
  };
  const latest = createSeasonEpisodeHandoff(second);
  assert.ok(latest);
  assert.equal(latest.attempt, 2);
  assert.deepEqual(latest.practicedMoves, ["identify", "request", "boundary"]);
  assert.equal(latest.practicedMoves.includes("location"), false);

  let beach = seedEpisodeState(initialState(), "day-04");
  beach = respond(beach, "Mi servono un lettino e un ombrellone.", createId);
  beach = respond(beach, "Un lettino, non due.", createId);
  beach = respond(beach, "Niente, grazie.", createId);
  beach = finishPendingOutcome(beach, createId);
  const result = beach.episodeResults["day-04"]?.[0];
  assert.equal(result?.verifiedFacts.quantityClarified, true);
  assert.equal(result?.verifiedFacts.priceConfirmed, undefined);
  assert.equal(result?.observedMoves.includes("price"), false);
});

test("legacy relationship descriptions migrate into facts and bounded dispositions", () => {
  const migrated = hydrateGameState({
    schemaVersion: 2,
    episodeId: "day-03",
    turnId: "d03_02_here",
    status: "active",
    relationships: { Giulia: "First espresso served", Raffaele: "warm" },
    knownFacts: ["Casa Limone: green door, first floor"],
  });
  assert.equal(migrated.relationships.Giulia, "neutral");
  assert.equal(migrated.relationships.Raffaele, "warm");
  assert.equal(migrated.knownFacts.includes("Giulia: First espresso served"), true);
  assert.equal(migrated.knownFacts.includes("Casa Limone: green door, first floor"), true);
  const malformed = hydrateGameState({
    ...initialState(),
    relationships: { Giulia: "invented biography" },
  });
  assert.equal(malformed.relationships.Giulia, undefined);
  assert.equal(malformed.knownFacts.includes("Giulia: invented biography"), false);
});

test("v2 active, pending, and resolved saves migrate without duplicate effects", () => {
  const createId = ids();
  let pending = seedEpisodeState(initialState(), "day-04");
  pending = respond(pending, "Mi servono un lettino e un ombrellone.", createId);
  pending = respond(pending, "Un lettino, non due.", createId);
  pending = respond(pending, "Sì, con la carta.", createId);
  const restoredPending = hydrateGameState({ ...pending, schemaVersion: 2, sceneIndex: 4 });
  assert.equal(restoredPending.episodeId, "day-04");
  assert.equal(restoredPending.pendingOutcome, "E2-O1");
  assert.equal(restoredPending.money, 6760);
  const resolved = finishPendingOutcome(restoredPending, createId);
  const repeated = finishPendingOutcome(resolved, createId);
  assert.equal(repeated.money, 6760);
  assert.equal(repeated.status, "resolved");
  const restoredResolved = hydrateGameState({ ...resolved, schemaVersion: 2, sceneIndex: 4 });
  assert.equal(restoredResolved.status, "resolved");
  assert.equal(restoredResolved.outcome?.id, "E2-O1");
});
