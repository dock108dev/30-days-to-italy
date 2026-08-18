import {
  createDefaultLifecycleState,
  normalizeLifecycleState,
  type LifecycleState,
} from "./model";

export const LIFECYCLE_STORAGE_KEY = "thirty-days-to-italy-lifecycle-v1";

export type LifecycleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedLifecycleState(serialized: string | null): LifecycleState {
  if (!serialized) return createDefaultLifecycleState();
  try {
    return normalizeLifecycleState(JSON.parse(serialized));
  } catch {
    return createDefaultLifecycleState();
  }
}

export function loadLifecycleState(storage: LifecycleStorage): LifecycleState {
  try {
    return parseSavedLifecycleState(storage.getItem(LIFECYCLE_STORAGE_KEY));
  } catch {
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
  } catch {
    return false;
  }
}

export function clearLifecycleState(storage: LifecycleStorage): boolean {
  try {
    storage.removeItem(LIFECYCLE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
