import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { applyResponse, finishPendingOutcome, seedEpisodeState } from "../app/game/engine";
import { initialState, type GameState } from "../app/game/model";
import {
  applyInsertedGuidedRefresher,
  beginGuidedBeachSession,
  beginRebuiltGuidedRefresher,
  completeGuidedBeachSession,
  observeGuidedBeachResponse,
  reconcileGuidedBeachSession,
  recordGuidedRefresherOpened,
  recordGuidedSupport,
} from "../app/guided/engine";
import { GuidedSessionReview } from "../app/guided/GuidedSessionViews";
import {
  createDefaultGuidedBeachSession,
  normalizeGuidedBeachSession,
} from "../app/guided/model";
import {
  GUIDED_SESSION_STORAGE_KEY,
  clearGuidedSession,
  loadGuidedSession,
  saveGuidedSession,
  type GuidedSessionStorage,
} from "../app/guided/persistence";
import { createGuidedBeachHandoff } from "../app/guided/pocket-deck-handoff";
import { PrototypeHeader } from "../app/prototype/PrototypeViews";


function memoryStorage() {
  const values = new Map<string, string>();
  const storage: GuidedSessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return { values, storage };
}

function advance(state: GameState, response: string): GameState {
  const result = applyResponse(state, response, () => `guided-${state.history.length + 1}`);
  assert.equal(result.kind, "advanced");
  return result.state;
}

test("guided sessions start fresh while retaining an attempt count", () => {
  const defaults = createDefaultGuidedBeachSession();
  const first = beginGuidedBeachSession(defaults);
  const used = recordGuidedSupport(
    applyInsertedGuidedRefresher(recordGuidedRefresherOpened(first, "need"), "need"),
    "carefulReplayCount",
  );
  const second = beginGuidedBeachSession(completeGuidedBeachSession(used, "E2-O1"));

  assert.equal(first.status, "in_progress");
  assert.equal(first.attempt, 1);
  assert.equal(second.status, "in_progress");
  assert.equal(second.attempt, 2);
  assert.equal(second.refresherOpened, false);
  assert.equal(second.carefulReplayCount, 0);
  assert.deepEqual(second.practicedMoves, []);
  assert.equal(second.outcomeId, null);
});

test("English fallback records a refresher without changing game state", () => {
  const game = seedEpisodeState(initialState(), "day-04");
  const gameBefore = structuredClone(game);
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());

  const teaching = applyResponse(game, "I need one chair and one umbrella");
  assert.equal(teaching.kind, "teaching");
  if (teaching.kind !== "teaching") return;

  session = recordGuidedRefresherOpened(session, teaching.phraseId);
  assert.equal(session.refresherOpened, true);
  assert.equal(session.refresherApplied, false);
  assert.deepEqual(game, gameBefore);

  session = applyInsertedGuidedRefresher(session, teaching.phraseId);
  assert.equal(session.refresherApplied, true);
  assert.equal(session.refresherMethod, "inserted");
  assert.deepEqual(session.practicedMoves, []);
});

test("building the refreshed phrase applies only after an Italian response", () => {
  let session = beginRebuiltGuidedRefresher(
    beginGuidedBeachSession(createDefaultGuidedBeachSession()),
    "need",
  );
  const before = seedEpisodeState(initialState(), "day-04");
  const afterEnglish = { ...before, turnId: "e02_03_quantity" };
  session = observeGuidedBeachResponse(session, before, "I need help", afterEnglish);
  assert.equal(session.awaitingRebuiltResponse, true);
  assert.equal(session.refresherApplied, false);

  const afterItalian = advance(before, "Mi servono un lettino e un ombrellone");
  session = observeGuidedBeachResponse(session, before, "Mi servono un lettino e un ombrellone", afterItalian);
  assert.equal(session.awaitingRebuiltResponse, false);
  assert.equal(session.refresherApplied, true);
  assert.equal(session.refresherMethod, "rebuilt");
});

test("guided evidence follows the authoritative beach result", () => {
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());
  let game = seedEpisodeState(initialState(), "day-04");

  let next = advance(game, "Mi servono un lettino e un ombrellone");
  session = observeGuidedBeachResponse(session, game, "Mi servono un lettino e un ombrellone", next);
  game = next;

  next = advance(game, "Un lettino, non due");
  session = observeGuidedBeachResponse(session, game, "Un lettino, non due", next);
  game = next;

  next = advance(game, "Sì, va bene. Con la carta.");
  session = observeGuidedBeachResponse(session, game, "Sì, va bene. Con la carta.", next);
  game = next;

  assert.equal(game.pendingOutcome, "E2-O1");
  assert.equal(game.money, 6760);
  assert.equal(session.quantityClarified, true);
  assert.equal(session.priceConfirmed, true);
  assert.deepEqual(session.practicedMoves, ["request", "quantity", "confirm"]);

  game = finishPendingOutcome(game, () => "guided-finish");
  assert.equal(game.outcome?.id, "E2-O1");
  session = reconcileGuidedBeachSession(session, game);
  assert.equal(session.status, "complete");
  assert.equal(session.outcomeId, game.outcome.id);
});

test("declining does not invent a practiced request or confirmed price", () => {
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());
  const before = seedEpisodeState(initialState(), "day-04");
  const after = advance(before, "Basta");

  session = observeGuidedBeachResponse(session, before, "Basta", after);
  assert.equal(after.pendingOutcome, "E2-O4");
  assert.deepEqual(session.practicedMoves, []);
  assert.equal(session.priceConfirmed, false);
});

test("support evidence counts replays, slower audio, and transcript independently", () => {
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());
  session = recordGuidedSupport(session, "normalReplayCount");
  session = recordGuidedSupport(session, "carefulReplayCount");
  session = recordGuidedSupport(session, "carefulReplayCount");
  session = recordGuidedSupport(session, "transcriptRevealCount");
  assert.deepEqual(
    [session.normalReplayCount, session.carefulReplayCount, session.transcriptRevealCount],
    [1, 2, 1],
  );
});

test("guided persistence round-trips and malformed state recovers safely", () => {
  const { values, storage } = memoryStorage();
  const complete = completeGuidedBeachSession(
    beginGuidedBeachSession(createDefaultGuidedBeachSession()),
    "E2-O2",
  );
  assert.equal(saveGuidedSession(storage, complete), true);
  assert.deepEqual(loadGuidedSession(storage), complete);
  assert.equal(values.has(GUIDED_SESSION_STORAGE_KEY), true);
  assert.equal(clearGuidedSession(storage), true);
  assert.deepEqual(loadGuidedSession(storage), createDefaultGuidedBeachSession());

  const repaired = normalizeGuidedBeachSession({
    ...complete,
    outcomeId: "E9-O9",
    practicedMoves: ["request", "invented", "request"],
  });
  assert.equal(repaired.status, "in_progress");
  assert.equal(repaired.outcomeId, null);
  assert.deepEqual(repaired.practicedMoves, ["request"]);

  const failing: GuidedSessionStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(loadGuidedSession(failing), createDefaultGuidedBeachSession());
  assert.equal(saveGuidedSession(failing, complete), false);
  assert.equal(clearGuidedSession(failing), false);
});

test("review offers a truthful Pocket Deck handoff after the request was practiced", () => {
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());
  session = applyInsertedGuidedRefresher(session, "need");
  const before = seedEpisodeState(initialState(), "day-04");
  const after = advance(before, "Mi servono un lettino e un ombrellone");
  session = observeGuidedBeachResponse(
    session,
    before,
    "Mi servono un lettino e un ombrellone",
    after,
  );
  session = recordGuidedSupport(session, "carefulReplayCount");
  session = completeGuidedBeachSession(session, "E2-O1");
  const handoff = createGuidedBeachHandoff(session);
  assert.ok(handoff);
  const html = renderToStaticMarkup(
    createElement(GuidedSessionReview, {
      session,
      handoff,
      handoffApplied: false,
      onCarryToDeck: () => undefined,
      onOpenInTripMode: () => undefined,
      onPracticeAgain: () => undefined,
    }),
  );

  assert.match(html, /You handled the beach/);
  assert.match(html, /Exactly what you wanted/);
  assert.match(html, /−€22.00/);
  assert.match(html, /Mi servono un lettino e un ombrellone/);
  assert.match(html, /using the suggested reply/);
  assert.match(html, /Carry this into my Pocket Deck/);
  assert.match(html, /strengthen the existing beach card/);
  assert.match(html, /Practice this situation again/);
  assert.doesNotMatch(html, /score|points|card added/i);
});

test("an applied handoff changes the review action without adding a second claim", () => {
  let session = beginGuidedBeachSession(createDefaultGuidedBeachSession());
  const before = seedEpisodeState(initialState(), "day-04");
  const after = advance(before, "Mi servono un lettino e un ombrellone");
  session = observeGuidedBeachResponse(
    session,
    before,
    "Mi servono un lettino e un ombrellone",
    after,
  );
  session = completeGuidedBeachSession(session, "E2-O1");
  const handoff = createGuidedBeachHandoff(session);
  assert.ok(handoff);

  const html = renderToStaticMarkup(
    createElement(GuidedSessionReview, {
      session,
      handoff,
      handoffApplied: true,
      onCarryToDeck: () => undefined,
      onOpenInTripMode: () => undefined,
      onPracticeAgain: () => undefined,
    }),
  );
  assert.match(html, /Carried to your Pocket Deck/);
  assert.match(html, /Open in Trip Mode/);
  assert.doesNotMatch(html, /Carry this into my Pocket Deck/);
});

test("an early-exit review does not invent request or deck evidence", () => {
  const session = completeGuidedBeachSession(
    beginGuidedBeachSession(createDefaultGuidedBeachSession()),
    "E2-O4",
  );
  const handoff = createGuidedBeachHandoff(session);
  assert.equal(handoff, null);
  const html = renderToStaticMarkup(
    createElement(GuidedSessionReview, {
      session,
      handoff,
      handoffApplied: false,
      onCarryToDeck: () => undefined,
      onOpenInTripMode: () => undefined,
      onPracticeAgain: () => undefined,
    }),
  );

  assert.match(html, /No rental/);
  assert.match(html, /did not practice the Mi servono request/);
  assert.match(html, /Practice the beach request before anything is carried/);
  assert.doesNotMatch(html, /You formed the request|This language is ready for your Pocket Deck/);
});

test("header copy reflects Prepare and Trip modes", () => {
  const prepare = renderToStaticMarkup(createElement(PrototypeHeader, { mode: "prepare" }));
  const trip = renderToStaticMarkup(createElement(PrototypeHeader, { mode: "trip" }));
  assert.match(prepare, /Trip rehearsal/);
  assert.match(trip, /Pocket guide/);
  assert.match(prepare, /30 Days to Italy/);
  assert.match(trip, /Private/);
  assert.doesNotMatch(trip, /Trip rehearsal/);
});
