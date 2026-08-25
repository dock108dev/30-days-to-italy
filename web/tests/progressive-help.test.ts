import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceProgressiveHelp,
  nextEpisodeState,
  restartEpisodeState,
  submitEpisodeResponse,
} from "../app/game/engine";
import { hydrateGameState } from "../app/game/persistence";
import { initialState, type GameState, type ProgressiveHelpLevel } from "../app/game/model";
import { implementedEpisode } from "../app/season/registry";

const dayZeroTurns = [
  "e01_01_name",
  "e01_02_clarify_name",
  "e01_03_key",
  "e01_04_breakfast",
  "e01_05_optional",
] as const;
const dayOneTurns = ["d01_01_arrival", "d01_02_door"] as const;

function authoritativeSnapshot(state: GameState) {
  return {
    episodeId: state.episodeId,
    turnId: state.turnId,
    status: state.status,
    money: state.money,
    hotelKey: state.hotelKey,
    apartmentKey: state.apartmentKey,
    keyCustody: state.keyCustody,
    completed: state.completed,
    outcome: state.outcome,
    pendingOutcome: state.pendingOutcome,
    relationships: state.relationships,
    knownFacts: state.knownFacts,
    verifiedFacts: state.verifiedFacts,
    observedMoves: state.observedMoves,
    episodeResults: state.episodeResults,
  };
}

test("every active Day 0–1 turn owns bounded progressive-help content", () => {
  for (const [episodeId, turnIds] of [
    ["day-00", dayZeroTurns],
    ["day-01", dayOneTurns],
  ] as const) {
    const episode = implementedEpisode(episodeId)!;
    for (const turnId of turnIds) {
      const help = episode.turns[turnId].progressiveHelp;
      assert.ok(help, `${episodeId}:${turnId} must own its help content`);
      assert.ok(help.listenFor.length >= 1 && help.listenFor.length <= 2);
      assert.ok(help.listenFor.every((cue) => !/[.!?]\s/.test(cue)));
      assert.ok(help.meaning.length > 0);
      assert.ok(help.frame.includes("___"), `${turnId} frame must retain a meaningful slot`);
      assert.ok(!help.model.includes("___"), `${turnId} final model must be complete`);
      assert.notEqual(help.frame, help.model);
    }
  }
  assert.equal(implementedEpisode("day-02")!.turns.d02_01_request.progressiveHelp, undefined);
  assert.equal(implementedEpisode("day-08")!.turns.d08_01_help.progressiveHelp, undefined);
});

test("the help ladder advances sequentially, idempotently, and without world mutation", () => {
  let state = initialState();
  const before = authoritativeSnapshot(state);
  for (let level = 1; level <= 6; level += 1) {
    state = advanceProgressiveHelp(state, level as ProgressiveHelpLevel);
    assert.equal(state.progressiveHelp[state.turnId]?.highestLevel, level);
    assert.deepEqual(authoritativeSnapshot(state), before);
    const repeated = advanceProgressiveHelp(state, level as ProgressiveHelpLevel);
    assert.deepEqual(repeated, state, `repeating level ${level} must be idempotent`);
  }
  assert.equal(state.progressiveHelp.e01_01_name?.normalReplayCount, 1);
  assert.equal(state.progressiveHelp.e01_01_name?.carefulReplayCount, 1);
  assert.deepEqual(state.progressiveHelp.e01_01_name?.revealedLevels, [1, 2, 3, 4, 5, 6]);
});

test("help cannot skip forward and mid-ladder reload restores the exact boundary", () => {
  const untouched = initialState();
  assert.equal(advanceProgressiveHelp(untouched, 3), untouched);
  const levelOne = advanceProgressiveHelp(untouched, 1);
  assert.equal(advanceProgressiveHelp(levelOne, 3), levelOne);
  const levelTwo = advanceProgressiveHelp(levelOne, 2);
  const levelThree = advanceProgressiveHelp(levelTwo, 3);
  const reloaded = hydrateGameState(JSON.parse(JSON.stringify(levelThree)));
  assert.deepEqual(reloaded.progressiveHelp, levelThree.progressiveHelp);
  assert.equal(reloaded.progressiveHelp.e01_01_name?.highestLevel, 3);
});

test("turn transition starts unrevealed while completion records truthful per-turn history", () => {
  let state = advanceProgressiveHelp(initialState(), 1);
  state = advanceProgressiveHelp(state, 2);
  state = advanceProgressiveHelp(state, 3);
  const identity = submitEpisodeResponse(state, "Fuscoletti. Ho una prenotazione.");
  assert.equal(identity.kind, "advanced");
  if (identity.kind !== "advanced") return;
  assert.equal(identity.state.turnId, "e01_03_key");
  assert.equal(identity.state.progressiveHelp.e01_03_key, undefined);
  let keyTurn = advanceProgressiveHelp(identity.state, 1);
  keyTurn = advanceProgressiveHelp(keyTurn, 2);
  keyTurn = advanceProgressiveHelp(keyTurn, 3);
  keyTurn = advanceProgressiveHelp(keyTurn, 4);
  const completed = submitEpisodeResponse(keyTurn, "Camera dodici, primo piano.");
  assert.equal(completed.kind, "advanced");
  if (completed.kind !== "advanced") return;
  const result = completed.state.episodeResults["day-00"]?.[0];
  assert.equal(result?.progressiveHelp.e01_01_name?.highestLevel, 3);
  assert.equal(result?.progressiveHelp.e01_03_key?.highestLevel, 4);
});

test("episode transition and replay clear revealed answers without erasing recorded completion", () => {
  let state = advanceProgressiveHelp(initialState(), 1);
  state = submitEpisodeResponse(state, "Fuscoletti. Ho una prenotazione.").state;
  state = submitEpisodeResponse(state, "Camera dodici, primo piano.").state;
  const recorded = state.episodeResults["day-00"];
  const dayOne = nextEpisodeState(state);
  assert.deepEqual(dayOne.progressiveHelp, {});
  assert.deepEqual(dayOne.episodeResults["day-00"], recorded);
  const revealedDayOne = advanceProgressiveHelp(dayOne, 1);
  const replay = restartEpisodeState(revealedDayOne);
  assert.deepEqual(replay.progressiveHelp, {});
  assert.deepEqual(replay.episodeResults["day-00"], recorded);
});
