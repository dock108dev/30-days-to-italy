import { clearSavedGame, type LocalGameStorage } from "../game/persistence";
import { clearGuidedSession } from "../guided/persistence";
import { clearLifecycleState } from "../lifecycle/persistence";
import { clearPocketDeckState } from "../pocket-deck/persistence";
import { clearTripProfile } from "../trip/persistence";

export type AppLocalStorage = LocalGameStorage;

export function clearAllLocalState(storage: AppLocalStorage): void {
  try {
    clearSavedGame(storage);
  } catch {
    // Continue clearing the other independent local domains.
  }
  clearTripProfile(storage);
  clearLifecycleState(storage);
  clearGuidedSession(storage);
  clearPocketDeckState(storage);
}
