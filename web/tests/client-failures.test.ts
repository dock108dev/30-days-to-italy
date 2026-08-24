import assert from "node:assert/strict";
import test from "node:test";

import {
  reportClientFailure,
  resetClientFailureCountsForTests,
  subscribeToClientFailures,
  type ClientFailure,
} from "../app/observability/client-failures";

test("operational failures are structured, counted, and exclude exception messages", () => {
  resetClientFailureCountsForTests();
  const observed: ClientFailure[] = [];
  const unsubscribe = subscribeToClientFailures((failure) => observed.push(failure));

  const input = {
    code: "PERSISTENCE_WRITE_FAILED" as const,
    domain: "game" as const,
    operation: "save",
    severity: "error" as const,
    userMessage: "Progress was not saved.",
  };
  reportClientFailure(input, new Error("secret traveler value"));
  reportClientFailure(input, new Error("another private value"));
  unsubscribe();

  assert.equal(observed.length, 2);
  assert.equal(observed[0].occurrence, 1);
  assert.equal(observed[1].occurrence, 2);
  assert.equal(observed[0].causeType, "Error");
  assert.equal(observed[0].code, "PERSISTENCE_WRITE_FAILED");
  assert.equal(JSON.stringify(observed).includes("secret traveler value"), false);
  assert.equal(JSON.stringify(observed).includes("another private value"), false);
});

test("unsubscribed listeners do not receive later failures", () => {
  resetClientFailureCountsForTests();
  let calls = 0;
  const unsubscribe = subscribeToClientFailures(() => { calls += 1; });
  unsubscribe();
  reportClientFailure({
    code: "AUDIO_PLAYBACK_FAILED",
    domain: "audio",
    operation: "play-rehearsal-line",
    severity: "warning",
    userMessage: "Text remains available.",
  });
  assert.equal(calls, 0);
});
