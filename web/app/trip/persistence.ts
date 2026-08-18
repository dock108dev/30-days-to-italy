import { normalizeTripProfile, type TripProfile } from "./model";

export const TRIP_PROFILE_STORAGE_KEY = "thirty-days-to-italy-trip-profile-v1";

export type TripProfileStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseSavedTripProfile(
  serialized: string | null,
  now = new Date(),
): TripProfile | null {
  if (!serialized) return null;
  try {
    return normalizeTripProfile(JSON.parse(serialized), now);
  } catch {
    return null;
  }
}

export function loadTripProfile(
  storage: TripProfileStorage,
  now = new Date(),
): TripProfile | null {
  try {
    return parseSavedTripProfile(storage.getItem(TRIP_PROFILE_STORAGE_KEY), now);
  } catch {
    return null;
  }
}

export function saveTripProfile(storage: TripProfileStorage, profile: TripProfile): boolean {
  try {
    storage.setItem(TRIP_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearTripProfile(storage: TripProfileStorage): boolean {
  try {
    storage.removeItem(TRIP_PROFILE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
