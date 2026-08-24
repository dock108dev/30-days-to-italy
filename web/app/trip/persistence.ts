import { normalizeTripProfile, type TripProfile } from "./model";
import { reportClientFailure } from "../observability/client-failures";

export const TRIP_PROFILE_STORAGE_KEY = "thirty-days-to-italy-trip-profile-v1";

export type TripProfileStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedTripProfile(
  serialized: string | null,
  now = new Date(),
): TripProfile | null {
  if (!serialized) return null;
  try {
    return normalizeTripProfile(JSON.parse(serialized), now);
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_DATA_INVALID", domain: "trip", operation: "parse", severity: "error", userMessage: "Saved trip details could not be read. The original saved record was left in place." }, error);
    return null;
  }
}

export function loadTripProfile(
  storage: TripProfileStorage,
  now = new Date(),
): TripProfile | null {
  try {
    return parseSavedTripProfile(storage.getItem(TRIP_PROFILE_STORAGE_KEY), now);
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "trip", operation: "load", severity: "error", userMessage: "Trip details could not be read from this browser. Check browser storage settings." }, error);
    return null;
  }
}

export function saveTripProfile(storage: TripProfileStorage, profile: TripProfile): boolean {
  try {
    storage.setItem(TRIP_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "trip", operation: "save", severity: "error", userMessage: "Trip details were not saved. Keep this tab open and check browser storage before continuing." }, error);
    return false;
  }
}

export function clearTripProfile(storage: TripProfileStorage): boolean {
  try {
    storage.removeItem(TRIP_PROFILE_STORAGE_KEY);
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_CLEAR_FAILED", domain: "trip", operation: "clear", severity: "error", userMessage: "Saved trip details could not be cleared completely. Reload before starting another journey." }, error);
    return false;
  }
}
