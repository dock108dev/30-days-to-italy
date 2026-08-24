import assert from "node:assert/strict";
import test from "node:test";

import {
  checkpointAuditStatus,
  createDemoConductor,
  parseDemoConductor,
  updateDemoConductor,
} from "../app/admin/demo-conductor";
import { initialState, STORAGE_KEY } from "../app/game/model";
import { loadGame, saveGame } from "../app/game/persistence";
import { GUIDED_SESSION_STORAGE_KEY } from "../app/guided/persistence";
import { LIFECYCLE_STORAGE_KEY } from "../app/lifecycle/persistence";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import {
  ACTIVE_DEMO_STORAGE_KEY,
  APPLICATION_DOMAIN_STORAGE_KEYS,
  clearDemoNamespace,
  demoSessionStorage,
  exitDemoSession,
  isCurrentApplicationSession,
  loadActiveDemoSession,
  resetDemoSession,
  startDemoSession,
  type EnumerableSessionStorage,
} from "../app/persistence/session";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

class MemoryStorage implements EnumerableSessionStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  entries() { return [...this.values.entries()].sort(([left], [right]) => left.localeCompare(right)); }
}

const KNOWN_KEYS = [
  STORAGE_KEY,
  TRIP_PROFILE_STORAGE_KEY,
  LIFECYCLE_STORAGE_KEY,
  GUIDED_SESSION_STORAGE_KEY,
  POCKET_DECK_STORAGE_KEY,
];

test("namespaced storage isolates all five application domains and unknown owner records", () => {
  assert.deepEqual([...APPLICATION_DOMAIN_STORAGE_KEYS], KNOWN_KEYS);
  const storage = new MemoryStorage();
  for (const key of KNOWN_KEYS) storage.setItem(key, `owner:${key}`);
  storage.setItem("unknown-owner-record", "preserve-byte-for-byte");
  const demo = demoSessionStorage(storage, "demo-session-123");
  for (const key of KNOWN_KEYS) demo.setItem(key, `demo:${key}`);

  for (const key of KNOWN_KEYS) {
    assert.equal(storage.getItem(key), `owner:${key}`);
    assert.equal(demo.getItem(key), `demo:${key}`);
  }
  clearDemoNamespace(storage, "demo-session-123");
  for (const key of KNOWN_KEYS) assert.equal(storage.getItem(key), `owner:${key}`);
  assert.equal(storage.getItem("unknown-owner-record"), "preserve-byte-for-byte");
});

test("demo start, reload, reset, and exit preserve the complete owner snapshot", () => {
  const storage = new MemoryStorage();
  for (const key of KNOWN_KEYS) storage.setItem(key, `owner-raw:${key}`);
  storage.setItem("unknown-owner-record", "opaque");
  const before = storage.entries();

  const started = startDemoSession(storage, new Date("2026-08-15T12:00:00.000Z"));
  assert.equal(started.conductor.activeCheckpointId, "day-00");
  assert.equal(loadGame(started.storage).episodeId, "day-00");
  const resumed = loadActiveDemoSession(storage);
  assert.equal(resumed?.id, started.id);

  const changed = updateDemoConductor(started.conductor, {
    activeCheckpointId: "day-12",
    checkpointStatus: "simulated",
    advancedCanonically: ["day-12"],
    visitedCheckpointIds: ["day-00", "day-12"],
  }, new Date("2026-08-15T12:01:00.000Z"));
  started.storage.setItem("thirty-days-to-italy-demo-conductor-v1", JSON.stringify(changed));
  assert.equal(loadActiveDemoSession(storage)?.conductor.activeCheckpointId, "day-12");

  const reset = resetDemoSession(storage, started.id, new Date("2026-08-15T12:02:00.000Z"));
  assert.equal(reset?.conductor.activeCheckpointId, "day-00");
  assert.deepEqual(storage.entries().filter(([key]) => !key.includes("demo") && key !== ACTIVE_DEMO_STORAGE_KEY), before);

  exitDemoSession(storage, started.id);
  assert.deepEqual(storage.entries(), before);
});

test("malformed demo marker, metadata, and values fail closed without affecting owner", () => {
  const storage = new MemoryStorage();
  saveGame(storage, { ...initialState(), money: 4321 });
  const ownerRaw = storage.getItem(STORAGE_KEY);
  storage.setItem(ACTIVE_DEMO_STORAGE_KEY, "not-json");
  assert.equal(loadActiveDemoSession(storage), null);
  assert.equal(storage.getItem(STORAGE_KEY), ownerRaw);

  const demo = startDemoSession(storage, new Date("2026-08-15T13:00:00.000Z"));
  demo.storage.setItem("thirty-days-to-italy-demo-conductor-v1", JSON.stringify({ schemaVersion: 999 }));
  demo.storage.setItem(STORAGE_KEY, "malformed-demo-game");
  assert.equal(loadActiveDemoSession(storage), null);
  assert.equal(loadGame(storage).money, 4321);
  assert.equal(storage.getItem(STORAGE_KEY), ownerRaw);
});

test("session generation guard rejects owner-to-demo and demo-to-owner stale saves", () => {
  const owner = { mode: "owner" as const, id: "owner", generation: 1 };
  const demo = { mode: "demo" as const, id: "demo-12345678", generation: 2 };
  assert.equal(isCurrentApplicationSession(demo, owner), false);
  assert.equal(isCurrentApplicationSession(owner, demo), false);
  assert.equal(isCurrentApplicationSession(demo, demo), true);
});

test("conductor validates schema and keeps played and simulated audit truth", () => {
  const conductor = createDemoConductor("demo-12345678", new Date("2026-08-15T12:00:00.000Z"));
  const updated = updateDemoConductor(conductor, {
    activeCheckpointId: "day-04",
    checkpointStatus: "resolved",
    playedNormally: ["day-04"],
    advancedCanonically: ["day-03"],
    visitedCheckpointIds: ["day-00", "day-03", "day-04"],
  });
  assert.equal(checkpointAuditStatus(updated, "day-03"), "simulated");
  assert.equal(checkpointAuditStatus(updated, "day-04"), "resolved");
  assert.deepEqual(parseDemoConductor(JSON.stringify(updated), "demo-12345678"), updated);
  assert.equal(parseDemoConductor(JSON.stringify({ ...updated, schemaVersion: 2 }), "demo-12345678"), null);
  assert.equal(parseDemoConductor(JSON.stringify({ ...updated, activeCheckpointId: "day-99" }), "demo-12345678"), null);
});
