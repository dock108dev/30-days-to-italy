import assert from "node:assert/strict";
import test from "node:test";

import {
  restartEpisodeState,
  seedEpisodeState,
  submitEpisodeResponse,
} from "../app/game/engine";
import { initialState, type GameState } from "../app/game/model";
import { hydrateGameState } from "../app/game/persistence";
import { implementedEpisode } from "../app/season/registry";

function feedback(state: GameState) {
  return (state as GameState & {
    teachingFeedback?: { understood: string; natural: string; tryNext?: string } | null;
  }).teachingFeedback;
}

function atTurn(episodeId: "day-00" | "day-01", turnId: string): GameState {
  return { ...seedEpisodeState(initialState(), episodeId), turnId };
}

function authoritative(state: GameState) {
  return {
    turnId: state.turnId,
    status: state.status,
    pendingOutcome: state.pendingOutcome,
    outcome: state.outcome,
    money: state.money,
    hotelKey: state.hotelKey,
    apartmentKey: state.apartmentKey,
    keyCustody: state.keyCustody,
    completed: state.completed,
    results: state.episodeResults,
    facts: state.knownFacts,
    relationships: state.relationships,
    moves: state.observedMoves,
  };
}

test("all seven active Day 0-1 turns author bounded teaching feedback", () => {
  for (const [episodeId, turnIds] of [
    ["day-00", ["e01_01_name", "e01_02_clarify_name", "e01_03_key", "e01_04_breakfast", "e01_05_optional"]],
    ["day-01", ["d01_01_arrival", "d01_02_door"]],
  ] as const) {
    const definition = implementedEpisode(episodeId)!;
    for (const turnId of turnIds) {
      const authored = definition.turns[turnId] as typeof definition.turns[string] & {
        teachingFeedback?: Record<string, { understood: string; natural: string; tryNext?: string }>;
      };
      assert.ok(authored.teachingFeedback, `${turnId} must own feedback content`);
      for (const item of Object.values(authored.teachingFeedback ?? {})) {
        assert.ok(item.understood.length > 0 && item.understood.length <= 180);
        assert.ok(item.natural.length > 0 && item.natural.length <= 180);
        assert.ok(!item.tryNext || item.tryNext.length <= 180);
      }
    }
  }
});

test("successful identification and confirmations report only recognized intent and facts", () => {
  let day0 = submitEpisodeResponse(atTurn("day-00", "e01_01_name"), "Fuscoletti. Ho una prenotazione.").state;
  assert.deepEqual(feedback(day0), {
    understood: "You identified the check-in booking as Fuscoletti.",
    natural: "Ho una prenotazione a nome Fuscoletti.",
    tryNext: "Listen for camera and piano when Elena gives the key.",
  });

  day0 = submitEpisodeResponse(day0, "Camera dodici.").state;
  assert.match(feedback(day0)?.understood ?? "", /room 12/i);
  assert.doesNotMatch(feedback(day0)?.understood ?? "", /first floor/i);

  let day1 = submitEpisodeResponse(atTurn("day-01", "d01_01_arrival"), "Sì, sono Michael. Sono qui per la chiave.").state;
  assert.match(feedback(day1)?.understood ?? "", /identified yourself as Michael/i);
  assert.match(feedback(day1)?.understood ?? "", /asked for the key/i);
  day1 = submitEpisodeResponse(day1, "Ho capito: la porta verde, poi il primo piano.").state;
  assert.match(feedback(day1)?.understood ?? "", /green door/i);
  assert.match(feedback(day1)?.understood ?? "", /first floor/i);
});

test("partial Day 1 responses distinguish the recognized move and remain pending", () => {
  const start = atTurn("day-01", "d01_01_arrival");
  const identified = submitEpisodeResponse(start, "Sì, sono Michael.").state;
  assert.equal(identified.turnId, start.turnId);
  assert.match(feedback(identified)?.understood ?? "", /identified yourself as Michael/i);
  assert.match(feedback(identified)?.understood ?? "", /key request is still missing/i);

  const requested = submitEpisodeResponse(start, "Sono qui per la chiave.").state;
  assert.equal(requested.turnId, start.turnId);
  assert.match(feedback(requested)?.understood ?? "", /asked for the key/i);
  assert.match(feedback(requested)?.understood ?? "", /name is still missing/i);

  const directions = atTurn("day-01", "d01_02_door");
  for (const [response, recognized, missing] of [
    ["La porta verde.", "green door", "first floor"],
    ["Il primo piano.", "first floor", "green door"],
  ]) {
    const before = authoritative(directions);
    const after = submitEpisodeResponse(directions, response).state;
    assert.equal(after.turnId, directions.turnId);
    assert.match(feedback(after)?.understood ?? "", new RegExp(recognized, "i"));
    assert.match(feedback(after)?.understood ?? "", new RegExp(missing, "i"));
    assert.deepEqual(authoritative(after), before);
    assert.notEqual(feedback(after)?.natural, "Ho capito: la porta verde, poi il primo piano.");
  }
});

test("shallow and English guesses get no praise, no full answer, and no authoritative effect", () => {
  for (const [state, response] of [
    [atTurn("day-00", "e01_03_key"), "grazie"],
    [atTurn("day-01", "d01_02_door"), "green"],
    [atTurn("day-01", "d01_02_door"), "first"],
    [atTurn("day-01", "d01_01_arrival"), "Michael key"],
  ] as const) {
    const before = authoritative(state);
    const result = submitEpisodeResponse(state, response);
    const after = result.state;
    assert.deepEqual(authoritative(after), before);
    assert.match(feedback(after)?.understood ?? "", /nothing actionable/i);
    assert.doesNotMatch(JSON.stringify(feedback(after)), /Perfetto|well done|correct/i);
    assert.doesNotMatch(feedback(after)?.natural ?? "", /porta verde, poi il primo piano/i);
  }
});

test("Day 1 exit feedback is consequence-truthful and retained in completion evidence", () => {
  let state = submitEpisodeResponse(atTurn("day-01", "d01_01_arrival"), "Sì, sono Michael. Sono qui per la chiave.").state;
  state = submitEpisodeResponse(state, "Devo andare.").state;
  assert.equal(state.outcome?.id, "D01-O3");
  assert.equal(state.keyCustody.apartment, "held");
  assert.match(feedback(state)?.understood ?? "", /ended the handoff/i);
  assert.match(feedback(state)?.understood ?? "", /directions remain unconfirmed/i);
  assert.doesNotMatch(feedback(state)?.understood ?? "", /identified|confirmed the green/i);
  const latest = state.episodeResults["day-01"]?.[0] as unknown as { teachingFeedback?: unknown };
  assert.deepEqual(latest.teachingFeedback, feedback(state));
});

test("latest feedback replaces, reloads, completes truthfully, and replay clears only immediate feedback", () => {
  let state = atTurn("day-01", "d01_02_door");
  state = submitEpisodeResponse(state, "La porta verde.").state;
  const partial = feedback(state);
  assert.ok(partial);
  state = submitEpisodeResponse(state, "green").state;
  assert.notDeepEqual(feedback(state), partial);
  assert.match(feedback(state)?.understood ?? "", /nothing actionable/i);
  assert.deepEqual(feedback(hydrateGameState(JSON.parse(JSON.stringify(state)))), feedback(state));

  state = submitEpisodeResponse(state, "Ho capito: la porta verde, poi il primo piano.").state;
  const completedFeedback = feedback(state);
  assert.ok(completedFeedback);
  const recorded = (state.episodeResults["day-01"]?.[0] as unknown as { teachingFeedback?: unknown }).teachingFeedback;
  assert.deepEqual(recorded, completedFeedback);
  const replay = restartEpisodeState(state);
  assert.equal(feedback(replay), null);
  assert.deepEqual((replay.episodeResults["day-01"]?.[0] as unknown as { teachingFeedback?: unknown }).teachingFeedback, recorded);
});

test("malformed persisted teaching feedback fails closed and later episodes remain unchanged", () => {
  const poisoned = hydrateGameState({
    ...atTurn("day-01", "d01_02_door"),
    teachingFeedback: { understood: "x", natural: 7, tryNext: "y" },
  });
  assert.equal(feedback(poisoned), null);

  const day2 = seedEpisodeState(initialState(), "day-02");
  const after = hydrateGameState({
    ...submitEpisodeResponse(day2, "Fuscoletti. Ho una prenotazione.").state,
    teachingFeedback: { understood: "forged", natural: "forged" },
  });
  assert.equal(feedback(after), null);
});
