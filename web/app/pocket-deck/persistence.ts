import { CORE_POCKET_DECK_CARD_IDS } from "./catalog";
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
  } catch {
    return createDefaultPocketDeckState();
  }
}

export function loadPocketDeckState(storage: PocketDeckStorage): PocketDeckState {
  try {
    return parseSavedPocketDeckState(storage.getItem(POCKET_DECK_STORAGE_KEY));
  } catch {
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
  } catch {
    return false;
  }
}

export function clearPocketDeckState(storage: PocketDeckStorage): boolean {
  try {
    storage.removeItem(POCKET_DECK_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
