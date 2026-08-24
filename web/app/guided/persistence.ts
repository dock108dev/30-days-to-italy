import { normalizeGuidedBeachSession, type GuidedBeachSession } from "./model";
import { reportClientFailure } from "../observability/client-failures";

export const GUIDED_SESSION_STORAGE_KEY = "thirty-days-to-italy-guided-sessions-v1";

export type GuidedSessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedGuidedSession(serialized: string | null): GuidedBeachSession {
  if (!serialized) return normalizeGuidedBeachSession(null);
  try {
    return normalizeGuidedBeachSession(JSON.parse(serialized));
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_DATA_INVALID", domain: "guided", operation: "parse", severity: "error", userMessage: "Saved guided-practice progress could not be read. The original saved record was left in place." }, error);
    return normalizeGuidedBeachSession(null);
  }
}

export function loadGuidedSession(storage: GuidedSessionStorage): GuidedBeachSession {
  try {
    return parseSavedGuidedSession(storage.getItem(GUIDED_SESSION_STORAGE_KEY));
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "guided", operation: "load", severity: "error", userMessage: "Guided-practice progress could not be read from this browser." }, error);
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
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "guided", operation: "save", severity: "error", userMessage: "Your latest guided-practice progress was not saved. Keep this tab open and check browser storage." }, error);
    return false;
  }
}

export function clearGuidedSession(storage: GuidedSessionStorage): boolean {
  try {
    storage.removeItem(GUIDED_SESSION_STORAGE_KEY);
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_CLEAR_FAILED", domain: "guided", operation: "clear", severity: "error", userMessage: "Guided-practice progress could not be cleared completely. Reload before starting another journey." }, error);
    return false;
  }
}
