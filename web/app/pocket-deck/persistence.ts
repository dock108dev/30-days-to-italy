import { CORE_POCKET_DECK_CARD_IDS } from "./catalog";
import { reportClientFailure } from "../observability/client-failures";
import {
  createDefaultPocketDeckState,
  normalizePocketDeckState,
  type PocketDeckState,
} from "./model";

export const POCKET_DECK_STORAGE_KEY = "thirty-days-to-italy-pocket-deck-v1";

export type PocketDeckStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedPocketDeckState(serialized: string | null): PocketDeckState {
  if (!serialized) return createDefaultPocketDeckState();
  try {
    return normalizePocketDeckState(JSON.parse(serialized), CORE_POCKET_DECK_CARD_IDS);
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_DATA_INVALID", domain: "pocket-deck", operation: "parse", severity: "error", userMessage: "Saved Pocket Deck activity could not be read. Core travel cards remain available." }, error);
    return createDefaultPocketDeckState();
  }
}

export function loadPocketDeckState(storage: PocketDeckStorage): PocketDeckState {
  try {
    return parseSavedPocketDeckState(storage.getItem(POCKET_DECK_STORAGE_KEY));
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "pocket-deck", operation: "load", severity: "error", userMessage: "Pocket Deck activity could not be read from this browser. Core cards remain available." }, error);
    return createDefaultPocketDeckState();
  }
}

export function savePocketDeckState(
  storage: PocketDeckStorage,
  state: PocketDeckState,
): boolean {
  try {
    const normalized = normalizePocketDeckState(state, CORE_POCKET_DECK_CARD_IDS);
    storage.setItem(POCKET_DECK_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "pocket-deck", operation: "save", severity: "error", userMessage: "Pocket Deck pins, recent cards, or practice were not saved. Keep this tab open and check browser storage." }, error);
    return false;
  }
}

export function clearPocketDeckState(storage: PocketDeckStorage): boolean {
  try {
    storage.removeItem(POCKET_DECK_STORAGE_KEY);
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_CLEAR_FAILED", domain: "pocket-deck", operation: "clear", severity: "error", userMessage: "Pocket Deck activity could not be cleared completely. Reload before starting another journey." }, error);
    return false;
  }
}
