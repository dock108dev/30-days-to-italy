import type { GameState } from "../game/model";
import { parseSavedGame } from "../game/persistence";
import type { LifecycleState } from "../lifecycle/model";
import { parseSavedLifecycleState } from "../lifecycle/persistence";
import { reportClientFailure } from "../observability/client-failures";

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
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "demo", operation: "save-preview-return", severity: "error", userMessage: "The demo return point was not saved, so the preview was not opened." }, error);
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
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "demo", operation: "load-preview-return", severity: "error", userMessage: "The demo return point could not be read. Return to a documented checkpoint before continuing." }, error);
    return null;
  }
}

export function clearDemoPreviewReturn(storage: DemoPreviewStorage): void {
  try {
    storage.removeItem(DEMO_PREVIEW_RETURN_STORAGE_KEY);
  } catch (error) {
    // Preview state is demo-namespaced, so cleanup failure cannot corrupt the
    // owner journey, but it still needs to be visible to the facilitator.
    reportClientFailure({ code: "PERSISTENCE_CLEAR_FAILED", domain: "demo", operation: "clear-preview-return", severity: "warning", userMessage: "An isolated demo preview record could not be cleared. Owner progress was not affected." }, error);
  }
}
