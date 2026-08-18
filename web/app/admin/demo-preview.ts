import type { GameState } from "../game/model";
import { parseSavedGame } from "../game/persistence";
import type { LifecycleState } from "../lifecycle/model";
import { parseSavedLifecycleState } from "../lifecycle/persistence";

export const DEMO_PREVIEW_RETURN_STORAGE_KEY = "thirty-days-to-italy-demo-preview-return-v1";

export type DemoPreviewReturn = {
  schemaVersion: 1;
  game: GameState;
  lifecycle: LifecycleState;
};

export type DemoPreviewStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveDemoPreviewReturn(
  storage: DemoPreviewStorage,
  game: GameState,
  lifecycle: LifecycleState,
): boolean {
  try {
    storage.setItem(DEMO_PREVIEW_RETURN_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      game,
      lifecycle,
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadDemoPreviewReturn(
  storage: DemoPreviewStorage,
): DemoPreviewReturn | null {
  try {
    const raw = storage.getItem(DEMO_PREVIEW_RETURN_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (record.schemaVersion !== 1) return null;
    return {
      schemaVersion: 1,
      game: parseSavedGame(JSON.stringify(record.game)),
      lifecycle: parseSavedLifecycleState(JSON.stringify(record.lifecycle)),
    };
  } catch {
    return null;
  }
}

export function clearDemoPreviewReturn(storage: DemoPreviewStorage): void {
  try {
    storage.removeItem(DEMO_PREVIEW_RETURN_STORAGE_KEY);
  } catch {
    // A failed preview cleanup cannot affect the isolated owner namespace.
  }
}

