import { clearSavedGame, type LocalGameStorage } from "../game/persistence";
import { clearGuidedSession } from "../guided/persistence";
import { clearLifecycleState } from "../lifecycle/persistence";
import { clearPocketDeckState } from "../pocket-deck/persistence";
import { clearTripProfile } from "../trip/persistence";

export type AppLocalStorage = LocalGameStorage;

export function clearAllLocalState(storage: AppLocalStorage): boolean {
  // Each domain reports its own failure. Attempting every independent removal
  // avoids leaving extra data behind while the false result prevents claiming
  // that a partial reset succeeded.
  const results = [
    clearSavedGame(storage),
    clearTripProfile(storage),
    clearLifecycleState(storage),
    clearGuidedSession(storage),
    clearPocketDeckState(storage),
  ];
  return results.every(Boolean);
}
