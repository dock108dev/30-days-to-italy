import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWithCanonicalResult,
  assertCanonicalCheckpoint,
  assertValidDemoSeasonCompletion,
  canOpenDemoTripMode,
  canonicalPreEpisodeState,
} from "../app/admin/canonical-demo";
import { initialState } from "../app/game/model";
import { createDefaultPocketDeckState } from "../app/pocket-deck/model";
import { EPISODE_IDS } from "../app/season/manifest";
import { IMPLEMENTED_EPISODE_DEFINITIONS } from "../app/season/registry";

test("all 31 episode definitions expose coordinator-backed canonical demo paths", () => {
  assert.equal(IMPLEMENTED_EPISODE_DEFINITIONS.length, 31);
  let current = initialState();
  const deck = createDefaultPocketDeckState();
  for (const definition of IMPLEMENTED_EPISODE_DEFINITIONS) {
    assert.ok(definition.canonicalDemo.responses.length > 0);
    const before = canonicalPreEpisodeState(current, definition.id);
    assertCanonicalCheckpoint(before, definition.id, false);
    const advanced = advanceWithCanonicalResult(before, definition.id);
    assert.equal(advanced.applied, true);
    assert.equal(advanced.state.outcome?.id, definition.canonicalDemo.expectedOutcomeId);
    assert.equal(advanced.state.completed.length, EPISODE_IDS.indexOf(definition.id) + 1);
    assert.deepEqual(createDefaultPocketDeckState(), deck, "canonical advance must not carry Pocket Deck evidence");

    const repeated = advanceWithCanonicalResult(advanced.state, definition.id);
    assert.equal(repeated.applied, false);
    assert.deepEqual(repeated.state, advanced.state);
    current = advanced.state;
  }
  assertValidDemoSeasonCompletion(current);
  assert.equal(canOpenDemoTripMode(current), true);
});

test("Trip Mode fails closed before completion and invalid Day 30 invariants are rejected", () => {
  const day30 = canonicalPreEpisodeState(initialState(), "day-30");
  assert.equal(canOpenDemoTripMode(day30), false);
  const completed = advanceWithCanonicalResult(day30, "day-30").state;
  assert.equal(canOpenDemoTripMode(completed), true);

  for (const invalid of [
    { ...completed, seasonCompletion: null },
    { ...completed, status: "resolved" as const },
    { ...completed, seasonCompletion: { ...completed.seasonCompletion!, departurePlan: "" } },
    { ...completed, seasonCompletion: { ...completed.seasonCompletion!, keyResolution: { hotel: "held" as const, apartment: "returned" as const } } },
    { ...completed, seasonCompletion: { ...completed.seasonCompletion!, obligations: [] } },
    { ...completed, hotelKey: true, keyCustody: { hotel: "held" as const, apartment: "returned" as const } },
    { ...completed, checkoutObligations: [] },
    { ...completed, openIssues: ["Traveler-reported checkout issue"] },
  ]) {
    assert.equal(canOpenDemoTripMode(invalid), false);
  }
});
