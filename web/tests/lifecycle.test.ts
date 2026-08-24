import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { applyResponse, seedEpisodeState } from "../app/game/engine";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { GUIDED_SESSION_STORAGE_KEY } from "../app/guided/persistence";
import { ModeNavigation, PrepareFocus } from "../app/lifecycle/LifecycleViews";
import {
  createDefaultLifecycleState,
  normalizeLifecycleState,
  withLifecycleMode,
} from "../app/lifecycle/model";
import {
  LIFECYCLE_STORAGE_KEY,
  clearLifecycleState,
  loadLifecycleState,
  parseSavedLifecycleState,
  saveLifecycleState,
  type LifecycleStorage,
} from "../app/lifecycle/persistence";
import { clearAllLocalState } from "../app/persistence/reset";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import { createDefaultTripProfile } from "../app/trip/model";
import { EPISODE_BY_ID } from "../app/season/manifest";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: LifecycleStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return { values, storage };
}

function respond(state: GameState, response: string): GameState {
  const result = applyResponse(state, response, () => `history-${state.history.length + 1}`);
  assert.equal(result.kind, "advanced");
  return result.state;
}

test("defaults to Prepare and normalizes malformed lifecycle state", () => {
  assert.deepEqual(createDefaultLifecycleState(), { schemaVersion: 1, mode: "prepare" });
  assert.deepEqual(normalizeLifecycleState({ schemaVersion: 1, mode: "trip" }), {
    schemaVersion: 1,
    mode: "trip",
  });
  assert.deepEqual(normalizeLifecycleState({ schemaVersion: 2, mode: "trip" }), {
    schemaVersion: 1,
    mode: "prepare",
  });
  assert.deepEqual(normalizeLifecycleState({ schemaVersion: 1, mode: "lesson" }), {
    schemaVersion: 1,
    mode: "prepare",
  });
  assert.deepEqual(parseSavedLifecycleState("not-json"), {
    schemaVersion: 1,
    mode: "prepare",
  });
});

test("lifecycle persistence round-trips and tolerates storage failures", () => {
  const { values, storage } = memoryStorage();
  const tripMode = { schemaVersion: 1, mode: "trip" } as const;

  assert.equal(saveLifecycleState(storage, tripMode), true);
  assert.deepEqual(loadLifecycleState(storage), tripMode);
  assert.equal(values.has(LIFECYCLE_STORAGE_KEY), true);
  assert.equal(clearLifecycleState(storage), true);
  assert.deepEqual(loadLifecycleState(storage), createDefaultLifecycleState());

  const failingStorage: LifecycleStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(loadLifecycleState(failingStorage), createDefaultLifecycleState());
  assert.equal(saveLifecycleState(failingStorage, tripMode), false);
  assert.equal(clearLifecycleState(failingStorage), false);
});

test("all five local state domains use distinct keys", () => {
  assert.equal(new Set([
    STORAGE_KEY,
    TRIP_PROFILE_STORAGE_KEY,
    LIFECYCLE_STORAGE_KEY,
    GUIDED_SESSION_STORAGE_KEY,
    POCKET_DECK_STORAGE_KEY,
  ]).size, 5);
});

test("full reset clears rehearsal, profile, lifecycle, guidance, and deck domains", () => {
  const { values, storage } = memoryStorage();
  values.set(STORAGE_KEY, "game");
  values.set(TRIP_PROFILE_STORAGE_KEY, "profile");
  values.set(LIFECYCLE_STORAGE_KEY, "lifecycle");
  values.set(GUIDED_SESSION_STORAGE_KEY, "guided");
  values.set(POCKET_DECK_STORAGE_KEY, "deck");

  assert.equal(clearAllLocalState(storage), true);

  assert.equal(values.has(STORAGE_KEY), false);
  assert.equal(values.has(TRIP_PROFILE_STORAGE_KEY), false);
  assert.equal(values.has(LIFECYCLE_STORAGE_KEY), false);
  assert.equal(values.has(GUIDED_SESSION_STORAGE_KEY), false);
  assert.equal(values.has(POCKET_DECK_STORAGE_KEY), false);
});

test("full reset attempts every domain and reports partial failure", () => {
  const removed: string[] = [];
  const storage: LifecycleStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem(key) {
      removed.push(key);
      if (key === STORAGE_KEY) throw new Error("blocked");
    },
  };

  assert.equal(clearAllLocalState(storage), false);
  assert.deepEqual(removed, [
    STORAGE_KEY,
    TRIP_PROFILE_STORAGE_KEY,
    LIFECYCLE_STORAGE_KEY,
    GUIDED_SESSION_STORAGE_KEY,
    POCKET_DECK_STORAGE_KEY,
  ]);
});

test("switching modes changes lifecycle presentation only", () => {
  let game = seedEpisodeState(initialState(), "day-04");
  game = {
    ...game,
    support: {
      ...game.support,
      beach: { replay: 2, careful: 1, transcript: 1 },
    },
    phrasePractice: { ...game.phrasePractice, need: 3 },
  };
  game = respond(game, "Mi servono un lettino e un ombrellone");
  game = respond(game, "Un lettino, non due");
  game = respond(game, "Sì, con la carta");
  assert.equal(game.pendingOutcome, "E2-O1");
  assert.equal(game.money, 6760);

  const gameBefore = structuredClone(game);
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const profileBefore = structuredClone(profile);
  const trip = withLifecycleMode(createDefaultLifecycleState(), "trip");
  const prepare = withLifecycleMode(trip, "prepare");

  assert.equal(trip.mode, "trip");
  assert.equal(prepare.mode, "prepare");
  assert.deepEqual(game, gameBefore);
  assert.deepEqual(profile, profileBefore);
});

test("mode navigation exposes the active mode accessibly", () => {
  const html = renderToStaticMarkup(
    createElement(ModeNavigation, { mode: "trip", onChange: () => undefined }),
  );

  assert.match(html, /aria-label="Product mode"/);
  assert.match(html, /aria-current="page"[^>]*><strong>Trip/);
  assert.match(html, />Prepare</);
  assert.match(html, />Trip</);
});

test("Prepare presents a practical focus and duration", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const html = renderToStaticMarkup(
    createElement(PrepareFocus, {
      profile,
      episode: EPISODE_BY_ID.get("day-04")!,
      isCurrent: false,
      sessionStatus: "not_started",
      onStart: () => undefined,
    }),
  );

  assert.match(html, /days until departure|Departure day|Trip underway/);
  assert.match(html, /One place in the shade/);
  assert.match(html, /About 8 minutes/);
  assert.match(html, /one beach chair and one umbrella/);
  assert.match(html, /Start rehearsal/);
  assert.match(html, /Trip details/);
});
