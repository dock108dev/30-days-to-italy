import assert from "node:assert/strict";
import test from "node:test";

import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ADMIN_FAST_TRACK_CHECKPOINTS,
  adminPreviewDate,
  inferAdminFastTrackCheckpoint,
  nextAdminFastTrackCheckpoint,
} from "../app/admin/fast-track";
import {
  ADMIN_TRUTH_PREVIEWS,
  seedAdminTruthPreview,
} from "../app/admin/truth-previews";
import { createDemoConductor } from "../app/admin/demo-conductor";
import { seedEpisodeState } from "../app/game/engine";
import { initialState } from "../app/game/model";
import {
  AdminModal,
  CompactSessionProgress,
  SeasonOverview,
} from "../app/prototype/PrototypeViews";
import { createDefaultTripProfile } from "../app/trip/model";

test("admin fast-track covers the implemented lifecycle in order", () => {
  assert.deepEqual(
    ADMIN_FAST_TRACK_CHECKPOINTS.map((checkpoint) => checkpoint.id),
    [...Array.from({ length: 31 }, (_, day) => `day-${String(day).padStart(2, "0")}`), "trip"],
  );
  assert.deepEqual(
    ADMIN_FAST_TRACK_CHECKPOINTS.map((checkpoint) => checkpoint.daysUntilDeparture),
    [30, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, -1],
  );
  assert.equal(nextAdminFastTrackCheckpoint(null)?.id, "day-00");
  assert.equal(nextAdminFastTrackCheckpoint("day-00")?.id, "day-01");
  assert.equal(nextAdminFastTrackCheckpoint("day-21")?.id, "day-22");
  assert.equal(nextAdminFastTrackCheckpoint("day-30")?.id, "trip");
  assert.equal(nextAdminFastTrackCheckpoint("trip"), null);
  assert.deepEqual(
    ADMIN_FAST_TRACK_CHECKPOINTS.slice(14, 22).map((checkpoint) => checkpoint.title),
    [
      "Handle a changed bus stop",
      "Correct the grocery total",
      "Collect a parcel without the expected document",
      "Remind Raffaele about the hot-water promise",
      "Find a pharmacy substitute",
      "Respond to a ferry cancellation",
      "Reject or accept an inadequate apartment fix",
      "The usual—or not",
    ],
  );
});

test("checkpoint inference follows the active scene and Trip Mode", () => {
  assert.equal(inferAdminFastTrackCheckpoint("prepare", "day-00").id, "day-00");
  assert.equal(inferAdminFastTrackCheckpoint("prepare", "day-04").id, "day-04");
  assert.equal(inferAdminFastTrackCheckpoint("prepare", "day-21").id, "day-21");
  assert.equal(inferAdminFastTrackCheckpoint("trip", "day-00").id, "trip");
});

test("Admin truth previews expose the conditional states without inventing history", () => {
  assert.deepEqual(
    ADMIN_TRUTH_PREVIEWS.map((preview) => preview.id),
    [
      "day-19-no-ticket",
      "day-21-replacement-bus",
      "day-21-rebooked",
      "day-21-refunded",
      "day-21-cancelled",
      "day-21-neutral",
    ],
  );

  const noTicket = seedAdminTruthPreview(initialState(), "day-19-no-ticket");
  assert.equal(noTicket.turnId, "d19_01_no_ticket");
  assert.equal(noTicket.money, 2000);
  assert.equal(noTicket.transportMode, "none");
  assert.equal(noTicket.transportStatus, "none");
  assert.equal(noTicket.ferryMemory, null);

  const replacementBus = seedAdminTruthPreview(initialState(), "day-21-replacement-bus");
  assert.equal(replacementBus.transportStatus, "replacement-bus");
  assert.match(replacementBus.ferryMemory ?? "", /replacement bus taken/);

  const rebooked = seedAdminTruthPreview(initialState(), "day-21-rebooked");
  assert.equal(rebooked.transportStatus, "rebooked");
  assert.equal(rebooked.transportTicketPrice, 1000);

  const refunded = seedAdminTruthPreview(initialState(), "day-21-refunded");
  assert.equal(refunded.transportStatus, "refunded");
  assert.equal(refunded.transportTicketPrice, 0);

  const cancelled = seedAdminTruthPreview(initialState(), "day-21-cancelled");
  assert.equal(cancelled.transportStatus, "cancelled");

  const neutral = seedAdminTruthPreview(initialState(), "day-21-neutral");
  assert.equal(neutral.transportStatus, "none");
  assert.equal(neutral.ferryMemory, null);
  assert.equal(
    neutral.knownFacts.some((fact) => /(ferry|bus|refund)/i.test(fact)),
    false,
  );
});

test("calendar previews are local, deterministic, and never mutate departure", () => {
  const departure = "2026-09-02";
  assert.equal(adminPreviewDate(departure, 30), "2026-08-03");
  assert.equal(adminPreviewDate(departure, 1), "2026-09-01");
  assert.equal(adminPreviewDate(departure, -1), "2026-09-03");
  assert.equal(adminPreviewDate("not-a-date", 30), null);
  assert.equal(departure, "2026-09-02");
});

test("Admin starts only an isolated walkthrough from owner mode", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const html = renderToStaticMarkup(
    createElement(AdminModal, {
      game: initialState(),
      profile,
      sessionMode: "owner",
      conductor: null,
      canOpenTripMode: false,
      onClose: () => undefined,
      onStartDemo: () => undefined,
      onSelectCheckpoint: () => undefined,
      onSelectTruthPreview: () => undefined,
      onPreviousCheckpoint: () => undefined,
      onPlayCheckpoint: () => undefined,
      onAdvanceCanonical: () => undefined,
      onNextCheckpoint: () => undefined,
      onOpenTripMode: () => undefined,
      onExitDemo: () => undefined,
      onResetDemo: () => undefined,
      onResetOwner: () => undefined,
    }),
  );

  assert.match(html, /Start demo walkthrough/);
  assert.match(html, /without touching this journey/);
  assert.match(html, /saved departure remains 2026-09-02/);
  assert.match(html, /Reset owner journey/);
  assert.doesNotMatch(html, /Advance with canonical result/);
});

test("Demo conductor renders valid immediate controls, grouped audit states, and separate reset", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const conductor = createDemoConductor("demo-12345678", new Date("2026-08-15T12:00:00.000Z"));
  const html = renderToStaticMarkup(createElement(AdminModal, {
    game: initialState(),
    profile,
    sessionMode: "demo",
    conductor,
    canOpenTripMode: false,
    onClose: () => undefined,
    onStartDemo: () => undefined,
    onSelectCheckpoint: () => undefined,
    onSelectTruthPreview: () => undefined,
    onPreviousCheckpoint: () => undefined,
    onPlayCheckpoint: () => undefined,
    onAdvanceCanonical: () => undefined,
    onNextCheckpoint: () => undefined,
    onOpenTripMode: () => undefined,
    onExitDemo: () => undefined,
    onResetDemo: () => undefined,
    onResetOwner: () => undefined,
  }));
  assert.match(html, /Demo conductor/);
  assert.match(html, /Play this checkpoint/);
  assert.match(html, /Advance with canonical result/);
  assert.match(html, /Simulated demo action/);
  assert.match(html, /All checkpoints/);
  assert.match(html, /Arrival foundation/);
  assert.match(html, /Departure and independence/);
  assert.match(html, /Conditional truth previews/);
  assert.match(html, /Reset demo/);
  assert.match(html, /Exit demo/);
  assert.match(html, /Trip Mode/);
  assert.match(html, /locked/);
  assert.doesNotMatch(html, /Reset owner journey/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
});

test("active progress stays compact and the traveler overview owns all sessions", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const game = seedEpisodeState(initialState(), "day-08");
  const compact = renderToStaticMarkup(createElement(CompactSessionProgress, {
    game,
    profile,
    today: "2026-08-10",
    adminBypass: true,
    onBrowse: () => undefined,
  }));
  assert.match(compact, /Day 8/);
  assert.match(compact, /Browse all 31 sessions/);
  assert.doesNotMatch(compact, /Day 7/);
  assert.doesNotMatch(compact, /Day 9/);

  const overview = renderToStaticMarkup(createElement(SeasonOverview, {
    game,
    profile,
    today: "2026-08-10",
    adminBypass: true,
    closeRef: createRef<HTMLButtonElement>(),
    onClose: () => undefined,
    onEditTrip: () => undefined,
    onSelect: () => undefined,
  }));
  assert.match(overview, /All 31 practical sessions/);
  assert.match(overview, /Day 30/);
  assert.equal((overview.match(/aria-current="step"/g) ?? []).length, 1);
  assert.doesNotMatch(overview, /Prototype admin/);
});
