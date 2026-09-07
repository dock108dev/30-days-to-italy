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

test("T2 gates entry, later material and future handoff cursors without intercepting results", async () => {
  const { preparationFor, preparationCursor, updatePreparation } = await import("../app/prototype/preparation");
  const { seedEpisodeState } = await import("../app/game/engine");
  for (const day of ["day-00", "day-01"] as const) {
    const start = seedEpisodeState(initialState(), day);
    assert.equal(preparationFor(start)?.activity.page, "situation");
    const listen = updatePreparation(start, preparationCursor(start)!, { page: "listen" });
    assert.equal(preparationFor(listen)?.activity.page, "listen");
    assert.ok(preparationCursor({ ...listen, preparation: { ...listen.preparation!, page: "handoff", mode: "encounter" } }));
    assert.equal(preparationFor({ ...listen, status: "resolved" }), null);
  }
  assert.equal(preparationFor(seedEpisodeState(initialState(), "day-02")), null);
  assert.equal(preparationFor({ ...initialState(), turnId: "e01_05_optional" })?.activity.page, "turn-brief");
  assert.equal(preparationFor({ ...initialState(), turnId: "e01_06_boundary", pendingOutcome: "E1-O4" }), null);
});

test("T3 factual result summaries distinguish zero, partial, historical and absent activity", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PreparationResultDetails } = await import("../app/prototype/PrototypeViews");
  const { hydrateGameState } = await import("../app/game/persistence");
  const { implementedEpisode } = await import("../app/season/registry");
  const finished = submitEpisodeResponse(initialState(), "Grazie, buonanotte").state;
  const render = (game: typeof finished) => renderToStaticMarkup(createElement(PreparationResultDetails, { game }));
  assert.match(render(finished), /Preparation activity was not recorded for this attempt/);
  const content = implementedEpisode("day-00")!.preparation!;
  for (const historical of [false, true]) {
    const game = structuredClone(finished);
    game.episodeResults["day-00"]![0].preparation = { contentVersion: historical ? "old-version" : content.version, traversedSegmentIds: historical ? ["old-segment"] : [], visitedExampleIds: [], audioAttempts: {} };
    const hydrated = hydrateGameState(game);
    const before = JSON.stringify(hydrated.episodeResults);
    const html = render(hydrated);
    assert.match(html, /Written examples viewed: 0/);
    assert.match(html, /normal 0, careful 0/);
    assert.match(html, /not a comprehension result/);
    if (historical) assert.match(html, /old-segment \(title unavailable; version old-version\)/);
    else assert.match(html, /Preparation pages viewed: 0/);
    render(hydrated);
    assert.equal(JSON.stringify(hydrated.episodeResults), before);
    hydrated.episodeResults["day-00"]![0].preparation!.traversedSegmentIds = [content.entry.id];
    if (!historical) assert.match(render(hydrated), new RegExp(content.entry.heading));
  }
});
