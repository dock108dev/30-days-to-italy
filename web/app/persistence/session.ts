import { initialState } from "../game/model";
import { STORAGE_KEY } from "../game/model";
import { saveGame } from "../game/persistence";
import { createDefaultGuidedBeachSession } from "../guided/model";
import { saveGuidedSession } from "../guided/persistence";
import { GUIDED_SESSION_STORAGE_KEY } from "../guided/persistence";
import { createDefaultLifecycleState } from "../lifecycle/model";
import { saveLifecycleState } from "../lifecycle/persistence";
import { LIFECYCLE_STORAGE_KEY } from "../lifecycle/persistence";
import { createDefaultPocketDeckState } from "../pocket-deck/model";
import { savePocketDeckState } from "../pocket-deck/persistence";
import { POCKET_DECK_STORAGE_KEY } from "../pocket-deck/persistence";
import { createDefaultTripProfile, type TripProfile } from "../trip/model";
import { saveTripProfile } from "../trip/persistence";
import { TRIP_PROFILE_STORAGE_KEY } from "../trip/persistence";
import {
  createDemoConductor,
  loadDemoConductor,
  saveDemoConductor,
  type DemoConductor,
} from "../admin/demo-conductor";

export const ACTIVE_DEMO_STORAGE_KEY = "thirty-days-to-italy-active-demo-v1";
export const DEMO_NAMESPACE_PREFIX = "thirty-days-to-italy-demo-v1";
export const DEMO_MARKER_SCHEMA_VERSION = 1 as const;
export const APPLICATION_DOMAIN_STORAGE_KEYS = [
  STORAGE_KEY,
  TRIP_PROFILE_STORAGE_KEY,
  LIFECYCLE_STORAGE_KEY,
  GUIDED_SESSION_STORAGE_KEY,
  POCKET_DECK_STORAGE_KEY,
] as const;

export type ApplicationSessionMode = "owner" | "demo";
export type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type EnumerableSessionStorage = SessionStorage & Pick<Storage, "length" | "key">;

export type OwnerApplicationSession = {
  mode: "owner";
  id: "owner";
  storage: SessionStorage;
};

export type DemoApplicationSession = {
  mode: "demo";
  id: string;
  storage: SessionStorage;
  conductor: DemoConductor;
};

export type ApplicationSession = OwnerApplicationSession | DemoApplicationSession;
export type ApplicationSessionToken = {
  mode: ApplicationSessionMode;
  id: string;
  generation: number;
};

type DemoMarker = {
  schemaVersion: typeof DEMO_MARKER_SCHEMA_VERSION;
  sessionId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{8,80}$/i.test(value);
}

function demoPrefix(sessionId: string): string {
  return `${DEMO_NAMESPACE_PREFIX}:${sessionId}:`;
}

export function isCurrentApplicationSession(
  active: ApplicationSessionToken | null,
  expected: ApplicationSessionToken,
): boolean {
  return Boolean(
    active &&
    active.mode === expected.mode &&
    active.id === expected.id &&
    active.generation === expected.generation,
  );
}

export function createNamespacedStorage(
  storage: SessionStorage,
  namespace: string,
): SessionStorage {
  const prefix = namespace.endsWith(":") ? namespace : `${namespace}:`;
  return {
    getItem(key) {
      return storage.getItem(`${prefix}${key}`);
    },
    setItem(key, value) {
      storage.setItem(`${prefix}${key}`, value);
    },
    removeItem(key) {
      storage.removeItem(`${prefix}${key}`);
    },
  };
}

export function ownerSession(storage: SessionStorage): OwnerApplicationSession {
  return { mode: "owner", id: "owner", storage };
}

export function demoSessionStorage(storage: SessionStorage, sessionId: string): SessionStorage {
  return createNamespacedStorage(storage, demoPrefix(sessionId));
}

function markerFromRaw(raw: string | null): DemoMarker | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.schemaVersion !== DEMO_MARKER_SCHEMA_VERSION ||
      !validSessionId(value.sessionId)
    ) return null;
    return {
      schemaVersion: DEMO_MARKER_SCHEMA_VERSION,
      sessionId: value.sessionId,
    };
  } catch {
    return null;
  }
}

function createSessionId(now: Date): string {
  const random = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${now.getTime().toString(36)}-${random}`.replace(/[^a-z0-9-]/gi, "-");
}

export function createSyntheticDemoTripProfile(now = new Date()): TripProfile {
  return {
    ...createDefaultTripProfile(now),
    regionLabel: "Synthetic demo · Campania / Amalfi Coast",
    party: "solo",
    socialPreference: "minimal",
  };
}

function seedDemoDomains(
  storage: SessionStorage,
  sessionId: string,
  now: Date,
): DemoConductor {
  const conductor = createDemoConductor(sessionId, now);
  saveGame(storage, initialState());
  saveTripProfile(storage, createSyntheticDemoTripProfile(now));
  saveLifecycleState(storage, createDefaultLifecycleState());
  saveGuidedSession(storage, createDefaultGuidedBeachSession());
  savePocketDeckState(storage, createDefaultPocketDeckState());
  saveDemoConductor(storage, conductor);
  return conductor;
}

export function loadActiveDemoSession(
  storage: EnumerableSessionStorage,
): DemoApplicationSession | null {
  const rawMarker = storage.getItem(ACTIVE_DEMO_STORAGE_KEY);
  if (!rawMarker) return null;
  const marker = markerFromRaw(rawMarker);
  if (!marker) {
    storage.removeItem(ACTIVE_DEMO_STORAGE_KEY);
    return null;
  }
  const scoped = demoSessionStorage(storage, marker.sessionId);
  const conductor = loadDemoConductor(scoped, marker.sessionId);
  const hasAllDomains = APPLICATION_DOMAIN_STORAGE_KEYS.every((key) => scoped.getItem(key) !== null);
  if (!conductor || !hasAllDomains) {
    clearDemoNamespace(storage, marker.sessionId);
    storage.removeItem(ACTIVE_DEMO_STORAGE_KEY);
    return null;
  }
  return { mode: "demo", id: marker.sessionId, storage: scoped, conductor };
}

export function startDemoSession(
  storage: EnumerableSessionStorage,
  now = new Date(),
): DemoApplicationSession {
  const existing = markerFromRaw(storage.getItem(ACTIVE_DEMO_STORAGE_KEY));
  if (existing) clearDemoNamespace(storage, existing.sessionId);
  storage.removeItem(ACTIVE_DEMO_STORAGE_KEY);

  const sessionId = createSessionId(now);
  const scoped = demoSessionStorage(storage, sessionId);
  const conductor = seedDemoDomains(scoped, sessionId, now);
  const marker: DemoMarker = {
    schemaVersion: DEMO_MARKER_SCHEMA_VERSION,
    sessionId,
  };
  storage.setItem(ACTIVE_DEMO_STORAGE_KEY, JSON.stringify(marker));
  return { mode: "demo", id: sessionId, storage: scoped, conductor };
}

export function resetDemoSession(
  storage: EnumerableSessionStorage,
  sessionId: string,
  now = new Date(),
): DemoApplicationSession | null {
  const marker = markerFromRaw(storage.getItem(ACTIVE_DEMO_STORAGE_KEY));
  if (!marker || marker.sessionId !== sessionId) return null;
  clearDemoNamespace(storage, sessionId);
  const scoped = demoSessionStorage(storage, sessionId);
  const conductor = seedDemoDomains(scoped, sessionId, now);
  return { mode: "demo", id: sessionId, storage: scoped, conductor };
}

export function clearDemoNamespace(
  storage: EnumerableSessionStorage,
  sessionId: string,
): void {
  const prefix = demoPrefix(sessionId);
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

export function exitDemoSession(
  storage: EnumerableSessionStorage,
  sessionId: string,
): void {
  clearDemoNamespace(storage, sessionId);
  const marker = markerFromRaw(storage.getItem(ACTIVE_DEMO_STORAGE_KEY));
  if (!marker || marker.sessionId === sessionId) {
    storage.removeItem(ACTIVE_DEMO_STORAGE_KEY);
  }
}
