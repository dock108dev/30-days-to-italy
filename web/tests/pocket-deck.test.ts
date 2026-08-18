import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { initialState } from "../app/game/model";
import { createDefaultGuidedBeachSession } from "../app/guided/model";
import { createGuidedBeachHandoff } from "../app/guided/pocket-deck-handoff";
import type { OfflineReadiness } from "../app/offline/model";
import { PocketDeck } from "../app/pocket-deck/PocketDeckViews";
import {
  CORE_POCKET_DECK_CARD_IDS,
  CORE_POCKET_DECK_CARDS,
  POCKET_DECK_CATEGORY_LABELS,
} from "../app/pocket-deck/catalog";
import {
  GUIDED_BEACH_CARD_ID,
  POCKET_DECK_PRACTICE_HISTORY_LIMIT,
  POCKET_DECK_RECENT_LIMIT,
  applyPocketDeckPracticeEvidence,
  createDefaultPocketDeckState,
  hasPocketDeckEvidence,
  normalizePocketDeckState,
  pocketDeckEvidenceForCard,
  recordRecentPocketDeckCard,
  togglePocketDeckPin,
  type PocketDeckPracticeEvidence,
} from "../app/pocket-deck/model";
import {
  POCKET_DECK_STORAGE_KEY,
  clearPocketDeckState,
  loadPocketDeckState,
  parseSavedPocketDeckState,
  savePocketDeckState,
  type PocketDeckStorage,
} from "../app/pocket-deck/persistence";
import {
  normalizePocketDeckSearch,
  searchPocketDeckCards,
} from "../app/pocket-deck/search";
import {
  acquirePocketDeckShowViewLock,
  lockPocketDeckDocumentScroll,
  releasePocketDeckShowViewLock,
} from "../app/pocket-deck/scroll-lock";
import { createDefaultTripProfile } from "../app/trip/model";

function practiceEvidence(attempt = 3): PocketDeckPracticeEvidence {
  return {
    id: `guided-beach:attempt-${attempt}`,
    cardId: GUIDED_BEACH_CARD_ID,
    source: "guided-beach",
    episodeId: "day-04",
    attempt,
    outcomeId: "E2-O1",
    practicedMoves: ["request", "quantity", "confirm"],
    refresherApplied: true,
    refresherMethod: "inserted",
    quantityClarified: true,
    priceConfirmed: true,
    preferenceSelected: null,
    normalReplayCount: 1,
    carefulReplayCount: 2,
    transcriptRevealCount: 1,
  };
}

const readyOffline: OfflineReadiness = {
  state: "ready",
  label: "Ready offline",
  detail: "Pocket Deck files are ready.",
  cacheVersion: "test-cache",
};

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: PocketDeckStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return { values, storage };
}

test("the core catalog contains exactly 30 complete, portable cards", async () => {
  assert.equal(CORE_POCKET_DECK_CARDS.length, 30);
  assert.equal(CORE_POCKET_DECK_CARD_IDS.size, 30);

  const publicRoot = new URL("../public/", import.meta.url);
  for (const card of CORE_POCKET_DECK_CARDS) {
    assert.equal(card.source, "core");
    assert.equal(card.audioTranscript, card.primaryItalian);
    assert.equal(card.normalAudio.startsWith("/audio/pocket-deck/normal/"), true);
    assert.equal(card.carefulAudio.startsWith("/audio/pocket-deck/careful/"), true);
    assert.notEqual(card.normalAudio, card.carefulAudio);
    assert.equal(/^https?:/i.test(card.normalAudio), false);
    assert.equal(/^https?:/i.test(card.carefulAudio), false);
    assert.equal(card.listenFor.length >= 2 && card.listenFor.length <= 3, true);
    assert.equal(card.searchTerms.length >= 3, true);
    assert.equal(Boolean(POCKET_DECK_CATEGORY_LABELS[card.category]), true);

    const [normal, careful] = await Promise.all([
      stat(new URL(card.normalAudio.slice(1), publicRoot)),
      stat(new URL(card.carefulAudio.slice(1), publicRoot)),
    ]);
    assert.equal(normal.size > 1_000, true);
    assert.equal(careful.size > 1_000, true);
    assert.notEqual(normal.size, careful.size);
  }
});

test("English intent search finds each required practical card", () => {
  const expected: Record<string, string> = {
    "one chair umbrella": "beach-one-chair-umbrella",
    "not two": "beach-one-not-two",
    repeat: "repeat-slower",
    "slow down": "repeat-slower",
    "wrong order": "wrong-order",
    "extra charge": "extra-bill-item",
    "bill is wrong": "extra-bill-item",
    "pay card": "pay-by-card",
    tired: "tired-tomorrow",
    later: "later-thanks",
    "don't understand": "dont-understand",
    "how much": "how-much",
    reservation: "hotel-reservation",
    "apartment key": "apartment-key",
    "bus ticket": "bus-ticket",
    "mosquito bites": "pharmacy-bites",
  };

  for (const [query, expectedId] of Object.entries(expected)) {
    const ids = searchPocketDeckCards(CORE_POCKET_DECK_CARDS, query).map((card) => card.id);
    assert.equal(ids.includes(expectedId), true, `${query} should find ${expectedId}`);
  }
});

test("search normalization tolerates case, punctuation, apostrophes, and diacritics", () => {
  assert.equal(normalizePocketDeckSearch("  DON’T—Understand!!! "), "don t understand");
  assert.equal(
    searchPocketDeckCards(CORE_POCKET_DECK_CARDS, "PIU TARDI")[0]?.id,
    "later-thanks",
  );
  assert.deepEqual(
    searchPocketDeckCards(CORE_POCKET_DECK_CARDS, "", "beach").map((card) => card.id),
    ["beach-one-chair-umbrella", "beach-one-not-two"],
  );
  assert.equal(searchPocketDeckCards(CORE_POCKET_DECK_CARDS, "spaceship").length, 0);
});

test("pins are idempotent and recent cards are ordered, deduplicated, and capped", () => {
  let state = createDefaultPocketDeckState();
  state = togglePocketDeckPin(state, "pay-by-card", CORE_POCKET_DECK_CARD_IDS);
  assert.deepEqual(state.pinnedCardIds, ["pay-by-card"]);
  state = togglePocketDeckPin(state, "pay-by-card", CORE_POCKET_DECK_CARD_IDS);
  assert.deepEqual(state.pinnedCardIds, []);
  assert.strictEqual(
    togglePocketDeckPin(state, "invented-card", CORE_POCKET_DECK_CARD_IDS),
    state,
  );

  for (const card of CORE_POCKET_DECK_CARDS.slice(0, 8)) {
    state = recordRecentPocketDeckCard(state, card.id, CORE_POCKET_DECK_CARD_IDS);
  }
  assert.equal(state.recentCardIds.length, POCKET_DECK_RECENT_LIMIT);
  assert.equal(state.recentCardIds[0], CORE_POCKET_DECK_CARDS[7].id);
  const reopened = state.recentCardIds[3];
  state = recordRecentPocketDeckCard(state, reopened, CORE_POCKET_DECK_CARD_IDS);
  assert.equal(state.recentCardIds[0], reopened);
  assert.equal(new Set(state.recentCardIds).size, state.recentCardIds.length);
});

test("v1 through v3 deck state migrate into the v4 practice domain", () => {
  const repaired = normalizePocketDeckState({
    schemaVersion: 1,
    pinnedCardIds: ["pay-by-card", "unknown", "pay-by-card", 4],
    recentCardIds: [
      ...CORE_POCKET_DECK_CARDS.map((card) => card.id),
      "unknown",
    ],
  }, CORE_POCKET_DECK_CARD_IDS);

  assert.deepEqual(repaired.pinnedCardIds, ["pay-by-card"]);
  assert.equal(repaired.recentCardIds.length, POCKET_DECK_RECENT_LIMIT);
  assert.equal(repaired.schemaVersion, 4);
  assert.deepEqual(repaired.practiceEvidenceByCardId, {});
  assert.deepEqual(
    normalizePocketDeckState({ schemaVersion: 2 }, CORE_POCKET_DECK_CARD_IDS),
    createDefaultPocketDeckState(),
  );
  const legacyEvidence = practiceEvidence();
  const migratedV3 = normalizePocketDeckState({
    schemaVersion: 3,
    practiceEvidenceByCardId: {
      [legacyEvidence.cardId]: [{ ...legacyEvidence, preferenceSelected: undefined }],
    },
  }, CORE_POCKET_DECK_CARD_IDS);
  assert.equal(migratedV3.schemaVersion, 4);
  assert.equal(migratedV3.practiceEvidenceByCardId[legacyEvidence.cardId][0].preferenceSelected, null);
  assert.equal(migratedV3.practiceEvidenceByCardId[legacyEvidence.cardId][0].outcomeId, legacyEvidence.outcomeId);
  assert.deepEqual(
    normalizePocketDeckState([], CORE_POCKET_DECK_CARD_IDS),
    createDefaultPocketDeckState(),
  );
  assert.deepEqual(parseSavedPocketDeckState("not-json"), createDefaultPocketDeckState());
});

test("deck persistence round-trips and tolerates storage failures", () => {
  const { values, storage } = memoryStorage();
  const state = {
    ...createDefaultPocketDeckState(),
    pinnedCardIds: ["pay-by-card"],
    recentCardIds: ["how-much", "pay-by-card"],
  };

  assert.equal(savePocketDeckState(storage, state), true);
  assert.deepEqual(loadPocketDeckState(storage), state);
  assert.equal(values.has(POCKET_DECK_STORAGE_KEY), true);
  assert.equal(clearPocketDeckState(storage), true);
  assert.deepEqual(loadPocketDeckState(storage), createDefaultPocketDeckState());

  const failing: PocketDeckStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(loadPocketDeckState(failing), createDefaultPocketDeckState());
  assert.equal(savePocketDeckState(failing, createDefaultPocketDeckState()), false);
  assert.equal(clearPocketDeckState(failing), false);
});

test("guided handoff stores bounded facts only when a request reached a real outcome", () => {
  const ineligible = {
    ...createDefaultGuidedBeachSession(),
    status: "complete" as const,
    attempt: 2,
    outcomeId: "E2-O4" as const,
  };
  assert.equal(createGuidedBeachHandoff(ineligible), null);

  const eligible = {
    ...ineligible,
    attempt: 3,
    outcomeId: "E2-O1" as const,
    practicedMoves: ["request", "quantity", "confirm"] as const,
    refresherOpened: true,
    refresherApplied: true,
    refresherMethod: "inserted" as const,
    quantityClarified: true,
    priceConfirmed: true,
    normalReplayCount: 1,
    carefulReplayCount: 2,
    transcriptRevealCount: 1,
  };
  const handoff = createGuidedBeachHandoff({
    ...eligible,
    practicedMoves: [...eligible.practicedMoves],
  });
  assert.deepEqual(handoff, practiceEvidence(3));
  assert.equal(Object.hasOwn(handoff ?? {}, "summary"), false);
  assert.equal(Object.hasOwn(handoff ?? {}, "score"), false);
});

test("practice handoffs are idempotent, bounded, and never alter pins or recents", () => {
  let state = {
    ...createDefaultPocketDeckState(),
    pinnedCardIds: ["pay-by-card"],
    recentCardIds: ["how-much"],
  };
  const first = practiceEvidence(1);
  state = applyPocketDeckPracticeEvidence(state, first, CORE_POCKET_DECK_CARD_IDS);
  assert.equal(hasPocketDeckEvidence(state, first.id), true);
  assert.deepEqual(state.pinnedCardIds, ["pay-by-card"]);
  assert.deepEqual(state.recentCardIds, ["how-much"]);

  const duplicate = applyPocketDeckPracticeEvidence(state, first, CORE_POCKET_DECK_CARD_IDS);
  assert.strictEqual(duplicate, state);
  assert.equal(pocketDeckEvidenceForCard(state, GUIDED_BEACH_CARD_ID).length, 1);

  for (let attempt = 2; attempt <= POCKET_DECK_PRACTICE_HISTORY_LIMIT + 3; attempt += 1) {
    state = applyPocketDeckPracticeEvidence(
      state,
      practiceEvidence(attempt),
      CORE_POCKET_DECK_CARD_IDS,
    );
  }
  const evidence = pocketDeckEvidenceForCard(state, GUIDED_BEACH_CARD_ID);
  assert.equal(evidence.length, POCKET_DECK_PRACTICE_HISTORY_LIMIT);
  assert.equal(evidence[0].attempt, POCKET_DECK_PRACTICE_HISTORY_LIMIT + 3);
  assert.equal(new Set(evidence.map((item) => item.id)).size, evidence.length);
  assert.equal(CORE_POCKET_DECK_CARDS.length, 30);
});

test("v2 normalization migrates valid evidence and drops malformed or duplicate entries", () => {
  const valid = practiceEvidence(3);
  const repaired = normalizePocketDeckState({
    schemaVersion: 2,
    pinnedCardIds: ["pay-by-card"],
    recentCardIds: [GUIDED_BEACH_CARD_ID],
    practiceEvidenceByCardId: {
      [GUIDED_BEACH_CARD_ID]: [
        valid,
        valid,
        { ...practiceEvidence(4), id: "wrong-id" },
        { ...practiceEvidence(5), practicedMoves: ["price"] },
        { ...practiceEvidence(6), refresherApplied: false, refresherMethod: "inserted" },
      ],
      "invented-card": [practiceEvidence(7)],
    },
  }, CORE_POCKET_DECK_CARD_IDS);

  assert.deepEqual(repaired.pinnedCardIds, ["pay-by-card"]);
  assert.deepEqual(repaired.recentCardIds, [GUIDED_BEACH_CARD_ID]);
  assert.deepEqual(pocketDeckEvidenceForCard(repaired, GUIDED_BEACH_CARD_ID), [valid]);
  assert.equal(Object.hasOwn(repaired.practiceEvidenceByCardId, "invented-card"), false);
});

test("practice evidence round-trips through the existing device-local deck key", () => {
  const { storage } = memoryStorage();
  const state = applyPocketDeckPracticeEvidence(
    createDefaultPocketDeckState(),
    practiceEvidence(3),
    CORE_POCKET_DECK_CARD_IDS,
  );
  assert.equal(savePocketDeckState(storage, state), true);
  assert.deepEqual(loadPocketDeckState(storage), state);
});

test("deck preference operations cannot mutate rehearsal or guided evidence", () => {
  const game = initialState();
  const guided = createDefaultGuidedBeachSession();
  const gameBefore = structuredClone(game);
  const guidedBefore = structuredClone(guided);
  let deck = createDefaultPocketDeckState();

  deck = togglePocketDeckPin(deck, "repeat-slower", CORE_POCKET_DECK_CARD_IDS);
  deck = recordRecentPocketDeckCard(deck, "repeat-slower", CORE_POCKET_DECK_CARD_IDS);

  assert.deepEqual(game, gameBefore);
  assert.deepEqual(guided, guidedBefore);
  assert.deepEqual(deck.pinnedCardIds, ["repeat-slower"]);
  assert.deepEqual(deck.recentCardIds, ["repeat-slower"]);
});

test("Trip Mode renders a real, no-teaching Pocket Deck home", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const html = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state: createDefaultPocketDeckState(),
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
  }));

  assert.match(html, /Trip Mode · Pocket Deck/);
  assert.match(html, /Search in English/);
  assert.match(html, /Quick access/);
  assert.match(html, /Situation categories/);
  assert.match(html, /Browse all 30 cards/);
  assert.match(html, /When the words disappear/);
  assert.match(html, /No lessons here/);
  assert.doesNotMatch(html, /Pocket Deck is not ready yet/);
  assert.doesNotMatch(html, /Teach me a phrase|Your response|Your objective|Prototype admin/);
  assert.doesNotMatch(html, /€100|World consequence|Listening support/);
});

test("Trip home deduplicates rehearsal, pin, and recent evidence before card detail", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  let state = applyPocketDeckPracticeEvidence(
    createDefaultPocketDeckState(),
    practiceEvidence(3),
    CORE_POCKET_DECK_CARD_IDS,
  );
  state = togglePocketDeckPin(state, GUIDED_BEACH_CARD_ID, CORE_POCKET_DECK_CARD_IDS);
  state = recordRecentPocketDeckCard(state, GUIDED_BEACH_CARD_ID, CORE_POCKET_DECK_CARD_IDS);
  const home = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state,
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
  }));
  assert.match(home, /Quick access/);
  assert.match(home, /Practiced/);
  assert.match(home, /Pinned/);
  assert.match(home, /Recent/);
  assert.match(home, /1 saved/);
  assert.match(home, /Browse all 30 cards/);
  assert.equal((home.match(/Mi servono un lettino e un ombrellone/g) ?? []).length, 1);
  assert.doesNotMatch(home, /\b(?:score|mastery|points|XP)\b/i);

  const detail = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state,
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: GUIDED_BEACH_CARD_ID,
  }));
  assert.match(detail, /You have handled this before/);
  assert.match(detail, /clarified one chair, not two, and confirmed the €22 option/);
  assert.match(detail, /1 beach rehearsal/);
  assert.match(detail, /reached for an English refresher/);

  const showView = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state,
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: GUIDED_BEACH_CARD_ID,
    initialShowLargeText: true,
  }));
  assert.doesNotMatch(showView, /From your rehearsal|handled this before|€22|Practiced/);
});

test("non-beach rehearsal evidence uses truthful episode wording", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const evidence: PocketDeckPracticeEvidence = {
    id: "season:day-01:attempt-1:apartment-key",
    cardId: "apartment-key",
    source: "season-episode",
    episodeId: "day-01",
    attempt: 1,
    outcomeId: "D01-O1",
    practicedMoves: ["identify", "request", "location"],
    refresherApplied: false,
    refresherMethod: null,
    quantityClarified: false,
    priceConfirmed: false,
    normalReplayCount: 0,
    carefulReplayCount: 0,
    transcriptRevealCount: 0,
  };
  const state = applyPocketDeckPracticeEvidence(createDefaultPocketDeckState(), evidence, CORE_POCKET_DECK_CARD_IDS);
  const html = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state,
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: "apartment-key",
  }));
  assert.match(html, /completed Day 1 using identify, request, location/);
  assert.match(html, /1 episode rehearsal/);
  assert.doesNotMatch(html, /beach rehearsal/);

  const refreshedState = applyPocketDeckPracticeEvidence(state, {
    ...evidence,
    id: "season:day-01:attempt-2:apartment-key",
    attempt: 2,
    refresherApplied: true,
    refresherMethod: "inserted",
  }, CORE_POCKET_DECK_CARD_IDS);
  const refreshedHtml = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state: refreshedState,
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: "apartment-key",
  }));
  assert.match(refreshedHtml, /used the Italian for this situation/);
  assert.doesNotMatch(refreshedHtml, /used Mi servono/);
});

test("card detail renders audio, likely reply, listening cues, and Show this", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const html = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state: createDefaultPocketDeckState(),
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: "beach-one-chair-umbrella",
  }));

  assert.match(html, /Mi servono un lettino e un ombrellone/);
  assert.match(html, /Normal audio/);
  assert.match(html, /Careful audio/);
  assert.match(html, /Likely reply/);
  assert.match(html, /Per una o due persone/);
  assert.match(html, /Listen for/);
  assert.match(html, /Show this/);
  assert.match(html, /Local audio · no connection used for this card/);
  assert.doesNotMatch(html, /Teach me a phrase|Your objective|€100/);
});

test("large-text view is a quiet, dismissible Italian-first dialog", () => {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  const html = renderToStaticMarkup(createElement(PocketDeck, {
    profile,
    state: createDefaultPocketDeckState(),
    offlineReadiness: readyOffline,
    onStateChange: () => undefined,
    onEditTrip: () => undefined,
    initialCardId: "pay-by-card",
    initialShowLargeText: true,
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Posso pagare con la carta/);
  assert.match(html, /Con la carta, per favore/);
  assert.match(html, /Close large-text view/);
  assert.match(html, /press Escape to return/);
  assert.doesNotMatch(html, /Search in English|Situation categories|Your objective|€100/);
});

test("Show this uses a fixed, independently scrolling overlay with sticky Close", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const component = await readFile(
    new URL("../app/pocket-deck/PocketDeckViews.tsx", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.deck-show-view \{[^}]*position: fixed;/);
  assert.match(css, /\.deck-show-view \{[^}]*inset: 0;/);
  assert.match(css, /\.deck-show-view \{[^}]*z-index: 1000;/);
  assert.match(css, /\.deck-show-view \{[^}]*width: 100%;/);
  assert.match(css, /\.deck-show-view \{[^}]*height: 100dvh;/);
  assert.match(css, /\.deck-show-view \{[^}]*overflow-x: hidden;/);
  assert.match(css, /\.deck-show-view \{[^}]*overflow-y: auto;/);
  assert.match(css, /\.deck-show-close \{[^}]*position: sticky;/);
  assert.match(css, /\.deck-show-close \{[^}]*top: 0;/);
  assert.match(component, /ref=\{dialogRef\}/);
  assert.match(component, /ref=\{closeButtonRef\}/);
  assert.match(component, /ref=\{showButtonRef\}/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /event\.key !== "Tab"/);
  assert.match(component, /focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /lockPocketDeckDocumentScroll\(document, window\)/);
});

test("scroll lock restores every touched style and the exact scroll position", () => {
  const bodyStyle = {
    overflow: "auto",
    overscrollBehavior: "contain",
    position: "relative",
    top: "3px",
    left: "4px",
    right: "5px",
    width: "90%",
  };
  const rootStyle = {
    overflow: "clip",
    overscrollBehavior: "auto",
    position: "",
    top: "",
    left: "",
    right: "",
    width: "",
  };
  const scrollCalls: [number, number][] = [];
  const documentTarget = {
    body: { style: bodyStyle },
    documentElement: { style: rootStyle },
  } as Parameters<typeof lockPocketDeckDocumentScroll>[0];
  const windowTarget = {
    scrollX: 17,
    scrollY: 283.5,
    scrollTo: (x: number, y: number) => scrollCalls.push([x, y]),
  };

  const unlock = lockPocketDeckDocumentScroll(documentTarget, windowTarget);
  assert.equal(rootStyle.overflow, "hidden");
  assert.equal(rootStyle.overscrollBehavior, "none");
  assert.equal(bodyStyle.overflow, "hidden");
  assert.equal(bodyStyle.position, "fixed");
  assert.equal(bodyStyle.top, "-283.5px");
  assert.equal(bodyStyle.left, "-17px");
  assert.equal(bodyStyle.right, "0px");
  assert.equal(bodyStyle.width, "100%");

  unlock();
  unlock();
  assert.deepEqual(bodyStyle, {
    overflow: "auto",
    overscrollBehavior: "contain",
    position: "relative",
    top: "3px",
    left: "4px",
    right: "5px",
    width: "90%",
  });
  assert.equal(rootStyle.overflow, "clip");
  assert.equal(rootStyle.overscrollBehavior, "auto");
  assert.deepEqual(scrollCalls, [[17, 283.5]]);
});

test("Show this captures nonzero scroll before rendering and never double-locks", async () => {
  const component = await readFile(
    new URL("../app/pocket-deck/PocketDeckViews.tsx", import.meta.url),
    "utf8",
  );
  const openLargeText = component.match(
    /function openLargeText\(\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";
  const closeLargeText = component.match(
    /const closeLargeText = useCallback\(\(\) => \{([\s\S]*?)\n  \},/,
  )?.[1] ?? "";

  const lockIndex = openLargeText.indexOf("acquirePocketDeckShowViewLock");
  const renderIndex = openLargeText.indexOf("setShowLargeText(true)");
  assert.equal(lockIndex >= 0, true);
  assert.equal(renderIndex >= 0, true);
  assert.equal(lockIndex < renderIndex, true);
  assert.match(closeLargeText, /restoreShowButtonFocusRef\.current = true/);
  assert.match(closeLargeText, /stopAudio\(\)/);
  assert.match(closeLargeText, /setShowLargeText\(false\)/);
  assert.match(component, /event\.key === "Escape"[\s\S]*?closeLargeText\(\)/);
  assert.match(component, /onClick=\{closeLargeText\}/);
  assert.match(
    component,
    /if \(!showLargeText\) return;[\s\S]*?acquirePocketDeckShowViewLock\([\s\S]*?return \(\) => \{[\s\S]*?releasePocketDeckShowViewLock\(unlockScrollRef\)/,
  );

  let currentScroll = 716.5;
  const captured: number[] = [];
  let unlockCount = 0;
  const unlockRef: { current: null | (() => void) } = { current: null };
  const createLock = () => {
    captured.push(currentScroll);
    return () => { unlockCount += 1; };
  };

  acquirePocketDeckShowViewLock(unlockRef, createLock);
  currentScroll = 0;
  acquirePocketDeckShowViewLock(unlockRef, createLock);
  assert.deepEqual(captured, [716.5]);

  releasePocketDeckShowViewLock(unlockRef);
  releasePocketDeckShowViewLock(unlockRef);
  assert.equal(unlockCount, 1);
  assert.equal(unlockRef.current, null);

  acquirePocketDeckShowViewLock(unlockRef, createLock);
  acquirePocketDeckShowViewLock(unlockRef, createLock);
  releasePocketDeckShowViewLock(unlockRef);
  assert.deepEqual(captured, [716.5, 0]);
  assert.equal(unlockCount, 2);
});
