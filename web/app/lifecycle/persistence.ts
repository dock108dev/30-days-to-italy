import {
  createDefaultLifecycleState,
  normalizeLifecycleState,
  type LifecycleState,
} from "./model";
import { reportClientFailure } from "../observability/client-failures";

export const LIFECYCLE_STORAGE_KEY = "thirty-days-to-italy-lifecycle-v1";

export type LifecycleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedLifecycleState(serialized: string | null): LifecycleState {
  if (!serialized) return createDefaultLifecycleState();
  try {
    return normalizeLifecycleState(JSON.parse(serialized));
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_DATA_INVALID", domain: "lifecycle", operation: "parse", severity: "error", userMessage: "Saved Prepare or Trip mode could not be read. The app recovered in Prepare mode." }, error);
    return createDefaultLifecycleState();
  }
}

export function loadLifecycleState(storage: LifecycleStorage): LifecycleState {
  try {
    return parseSavedLifecycleState(storage.getItem(LIFECYCLE_STORAGE_KEY));
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "lifecycle", operation: "load", severity: "error", userMessage: "Prepare or Trip mode could not be read from this browser." }, error);
    return createDefaultLifecycleState();
  }
}

export function saveLifecycleState(
  storage: LifecycleStorage,
  state: LifecycleState,
): boolean {
  try {
    storage.setItem(LIFECYCLE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "lifecycle", operation: "save", severity: "error", userMessage: "Your Prepare or Trip mode change was not saved. Keep this tab open and check browser storage." }, error);
    return false;
  }
}

export function clearLifecycleState(storage: LifecycleStorage): boolean {
  try {
    storage.removeItem(LIFECYCLE_STORAGE_KEY);
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_CLEAR_FAILED", domain: "lifecycle", operation: "clear", severity: "error", userMessage: "The saved mode could not be cleared completely. Reload before starting another journey." }, error);
    return false;
  }
}
