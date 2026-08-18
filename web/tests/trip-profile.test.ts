import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { initialState, STORAGE_KEY } from "../app/game/model";
import { clearSavedGame, saveGame } from "../app/game/persistence";
import {
  calendarDayDifference,
  departureCountdown,
  isValidLocalDate,
} from "../app/trip/date";
import {
  createDefaultTripProfile,
  normalizeTripProfile,
  type TripProfile,
} from "../app/trip/model";
import {
  TRIP_PROFILE_STORAGE_KEY,
  clearTripProfile,
  loadTripProfile,
  parseSavedTripProfile,
  saveTripProfile,
  type TripProfileStorage,
} from "../app/trip/persistence";
import { TripSetup, TripSummary } from "../app/trip/TripProfileViews";

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: TripProfileStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return { values, storage };
}

test("creates the recommended private-trip defaults 30 calendar days ahead", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));

  assert.equal(profile.departureDate, "2026-09-02");
  assert.equal(profile.tripLengthDays, 8);
  assert.equal(profile.regionLabel, "Campania / Amalfi Coast");
  assert.equal(profile.party, "solo");
  assert.equal(profile.lodging, "mixed");
  assert.deepEqual(profile.transport, ["ferry", "bus", "train", "walking"]);
  assert.equal(profile.beachPlans, "yes");
  assert.equal(profile.socialPreference, "minimal");
});

test("calculates calm calendar-day countdown copy across boundaries and DST", () => {
  assert.deepEqual(departureCountdown("2026-09-02", "2026-08-03"), {
    days: 30,
    label: "30 days until departure",
    status: "upcoming",
  });
  assert.equal(departureCountdown("2027-01-01", "2026-12-31").label, "1 day until departure");
  assert.equal(departureCountdown("2026-08-03", "2026-08-03").label, "Departure day");
  assert.equal(departureCountdown("2026-08-02", "2026-08-03").label, "Your trip is underway");
  assert.equal(calendarDayDifference("2026-03-09", "2026-03-07"), 2);
  assert.equal(calendarDayDifference("2026-11-02", "2026-10-31"), 2);
  assert.equal(calendarDayDifference("2027-01-02", "2026-12-30"), 3);
});

test("validates real local calendar dates", () => {
  assert.equal(isValidLocalDate("2028-02-29"), true);
  assert.equal(isValidLocalDate("2027-02-29"), false);
  assert.equal(isValidLocalDate("2026-13-01"), false);
  assert.equal(isValidLocalDate("08/03/2026"), false);
});

test("valid v1 profiles round-trip unchanged", () => {
  const profile: TripProfile = {
    ...createDefaultTripProfile(new Date(2026, 7, 3, 12)),
    departureDate: "2026-10-15",
    tripLengthDays: 10,
    regionLabel: "Salerno",
    party: "accompanied",
    lodging: "hotel",
    transport: ["train", "taxi"],
    beachPlans: "maybe",
    socialPreference: "more",
  };

  assert.deepEqual(normalizeTripProfile(structuredClone(profile)), profile);
  assert.deepEqual(parseSavedTripProfile(JSON.stringify(profile)), profile);
});

test("malformed profile values recover to bounded safe defaults", () => {
  const now = new Date(2026, 7, 3, 12);
  const normalized = normalizeTripProfile({
    schemaVersion: 1,
    departureDate: "2026-02-30",
    tripLengthDays: 400,
    regionLabel: `   ${"Coast ".repeat(30)}   `,
    party: "crowd",
    lodging: "boat",
    transport: ["ferry", "ferry", "hovercraft", 12],
    beachPlans: "always",
    socialPreference: "constant",
  }, now);

  assert.ok(normalized);
  assert.equal(normalized.departureDate, "2026-09-02");
  assert.equal(normalized.tripLengthDays, 30);
  assert.equal(normalized.regionLabel.length, 80);
  assert.equal(normalized.party, "solo");
  assert.equal(normalized.lodging, "mixed");
  assert.deepEqual(normalized.transport, ["ferry"]);
  assert.equal(normalized.beachPlans, "yes");
  assert.equal(normalized.socialPreference, "minimal");

  assert.equal(normalizeTripProfile({ schemaVersion: 2 }, now), null);
  assert.equal(normalizeTripProfile("broken", now), null);
  assert.equal(parseSavedTripProfile("not-json", now), null);
});

test("empty or unsupported transport and region values use recommended defaults", () => {
  const defaults = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const normalized = normalizeTripProfile({
    ...defaults,
    regionLabel: "   ",
    tripLengthDays: -20,
    transport: ["hovercraft"],
  }, new Date(2026, 7, 3, 12));

  assert.ok(normalized);
  assert.equal(normalized.regionLabel, defaults.regionLabel);
  assert.equal(normalized.tripLengthDays, 3);
  assert.deepEqual(normalized.transport, defaults.transport);
});

test("trip profile and rehearsal state use separate local keys", () => {
  const { values, storage } = memoryStorage();
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const game = initialState();

  assert.equal(saveTripProfile(storage, profile), true);
  const savedProfile = values.get(TRIP_PROFILE_STORAGE_KEY);
  saveGame(storage, game);

  assert.equal(values.get(TRIP_PROFILE_STORAGE_KEY), savedProfile);
  assert.equal(values.has(STORAGE_KEY), true);
  assert.notEqual(TRIP_PROFILE_STORAGE_KEY, STORAGE_KEY);
  assert.deepEqual(loadTripProfile(storage), profile);

  clearSavedGame(storage);
  assert.equal(values.has(STORAGE_KEY), false);
  assert.equal(values.has(TRIP_PROFILE_STORAGE_KEY), true);

  assert.equal(clearTripProfile(storage), true);
  assert.equal(values.has(TRIP_PROFILE_STORAGE_KEY), false);
});

test("profile storage failures never crash the prototype", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const failingStorage: TripProfileStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("blocked"); },
  };

  assert.equal(loadTripProfile(failingStorage), null);
  assert.equal(saveTripProfile(failingStorage, profile), false);
  assert.equal(clearTripProfile(failingStorage), false);
});

test("setup and saved-trip views render the full traveler contract", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const setup = renderToStaticMarkup(
    createElement(TripSetup, { initialProfile: profile, onSave: () => true }),
  );
  const summary = renderToStaticMarkup(
    createElement(TripSummary, { profile, onEdit: () => undefined }),
  );

  assert.match(setup, /Let’s prepare for your trip\./);
  assert.match(setup, /Use these trip details/);
  assert.match(setup, /Campania \/ Amalfi Coast/);
  assert.match(setup, /Saved only in this browser/);
  assert.doesNotMatch(setup, /passport number|payment card|booking confirmation/i);
  assert.match(summary, /Saved trip/);
  assert.match(summary, /Campania \/ Amalfi Coast/);
  assert.match(summary, /8 days/);
  assert.match(summary, /Edit trip/);
});
