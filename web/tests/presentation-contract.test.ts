import assert from "node:assert/strict";
import test from "node:test";

import {
  nextEpisodeState,
  submitEpisodeResponse,
} from "../app/game/engine";
import { initialState } from "../app/game/model";
import { createSeasonEpisodeHandoff } from "../app/season/pocket-deck-handoff";
import {
  pocketDeckReviewState,
  recordedIntentSummary,
} from "../app/prototype/PrototypeViews";

test("completion review describes the final accepted Day 0 and Day 1 response", () => {
  const dayZeroIdentity = submitEpisodeResponse(
    initialState(),
    "Fuscoletti. Ho una prenotazione.",
  );
  assert.equal(dayZeroIdentity.kind, "advanced");
  if (dayZeroIdentity.kind !== "advanced") return;

  const dayZero = submitEpisodeResponse(
    dayZeroIdentity.state,
    "Camera dodici, primo piano. Grazie.",
  );
  assert.equal(dayZero.kind, "advanced");
  if (dayZero.kind !== "advanced") return;
  assert.equal(dayZero.state.status, "resolved");
  assert.equal(recordedIntentSummary(dayZero.state), "You confirmed room 12 and the first floor.");

  const dayOneStart = nextEpisodeState(dayZero.state);
  const dayOneIdentity = submitEpisodeResponse(
    dayOneStart,
    "Sono Michael. Sono qui per la chiave.",
  );
  assert.equal(dayOneIdentity.kind, "advanced");
  if (dayOneIdentity.kind !== "advanced") return;

  const dayOne = submitEpisodeResponse(
    dayOneIdentity.state,
    "La porta verde, primo piano. Grazie.",
  );
  assert.equal(dayOne.kind, "advanced");
  if (dayOne.kind !== "advanced") return;
  assert.equal(dayOne.state.status, "resolved");
  assert.equal(recordedIntentSummary(dayOne.state), "You confirmed the green door and the first floor.");
});

test("Pocket Deck review state never claims persisted evidence before carry", () => {
  const identity = submitEpisodeResponse(
    initialState(),
    "Fuscoletti. Ho una prenotazione.",
  );
  assert.equal(identity.kind, "advanced");
  if (identity.kind !== "advanced") return;
  const completion = submitEpisodeResponse(
    identity.state,
    "Camera dodici, primo piano. Grazie.",
  );
  assert.equal(completion.kind, "advanced");
  if (completion.kind !== "advanced") return;

  const handoff = createSeasonEpisodeHandoff(completion.state);
  assert.ok(handoff);
  assert.equal(pocketDeckReviewState(handoff, false), "available");
  assert.equal(pocketDeckReviewState(handoff, true), "strengthened");
  assert.equal(pocketDeckReviewState(null, false), "none");
});
