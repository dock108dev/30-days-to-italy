import { normalizeGuidedBeachSession, type GuidedBeachSession } from "./model";

export const GUIDED_SESSION_STORAGE_KEY = "thirty-days-to-italy-guided-sessions-v1";

export type GuidedSessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedGuidedSession(serialized: string | null): GuidedBeachSession {
  if (!serialized) return normalizeGuidedBeachSession(null);
  try {
    return normalizeGuidedBeachSession(JSON.parse(serialized));
  } catch {
    return normalizeGuidedBeachSession(null);
  }
}

export function loadGuidedSession(storage: GuidedSessionStorage): GuidedBeachSession {
  try {
    return parseSavedGuidedSession(storage.getItem(GUIDED_SESSION_STORAGE_KEY));
  } catch {
    return normalizeGuidedBeachSession(null);
  }
}

export function saveGuidedSession(
  storage: GuidedSessionStorage,
  state: GuidedBeachSession,
): boolean {
  try {
    storage.setItem(GUIDED_SESSION_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearGuidedSession(storage: GuidedSessionStorage): boolean {
  try {
    storage.removeItem(GUIDED_SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
