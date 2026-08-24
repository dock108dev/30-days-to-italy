import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { STORAGE_KEY, initialState, type GameState } from "../app/game/model";
import { ACTIVE_DEMO_STORAGE_KEY, DEMO_NAMESPACE_PREFIX } from "../app/persistence/session";
import { GUIDED_SESSION_STORAGE_KEY } from "../app/guided/persistence";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3105;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = process.env.ITALY_EVIDENCE_ROOT
  ? resolve(process.env.ITALY_EVIDENCE_ROOT, "interaction")
  : resolve(root, "../../italian-pilot-evidence/candidate-20260823/interaction");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

type StoredDeck = {
  practiceEvidenceByCardId?: Record<string, { id: string }[]>;
};

async function firstAvailable(paths: readonly string[]): Promise<string> {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next known local browser.
    }
  }
  throw new Error("No Chromium browser is available. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.");
}

async function assertQaPortAvailable(): Promise<void> {
  await new Promise<void>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", (error) => reject(
      new Error(`The isolated QA origin ${baseUrl} is unavailable: ${error.message}`),
    ));
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => error ? reject(error) : resolvePort());
    });
  });
}

async function waitForServer(child: ChildProcess, output: () => string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`QA server exited early.\n${output()}`);
    try {
      const response = await fetch(baseUrl, { headers: { accept: "text/html" } });
      if (response.ok) return;
    } catch {
      // The local production server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`QA server did not become ready.\n${output()}`);
}

async function stopServer(child: ChildProcess | null): Promise<void> {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function installMediaControl(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value(this: HTMLMediaElement) {
        if (sessionStorage.getItem("italy-interaction-fail-audio-once") === "true") {
          sessionStorage.removeItem("italy-interaction-fail-audio-once");
          return Promise.reject(new DOMException("Simulated audio rejection", "NotSupportedError"));
        }
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value(this: HTMLMediaElement) {
        this.dispatchEvent(new Event("pause"));
      },
    });
  });
}

async function freshJourney(page: Page): Promise<void> {
  const profile = createDefaultTripProfile(new Date());
  const game = initialState();
  if (!page.url().startsWith(baseUrl)) {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  }
  await page.evaluate(({ profileKey, profileValue, gameKey, gameValue }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(profileKey, profileValue);
    localStorage.setItem(gameKey, gameValue);
  }, {
    profileKey: TRIP_PROFILE_STORAGE_KEY,
    profileValue: JSON.stringify(profile),
    gameKey: STORAGE_KEY,
    gameValue: JSON.stringify(game),
  });
  await page.goto("about:blank");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  try {
    await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor({ timeout: 5_000 });
  } catch (error) {
    const diagnostic = await page.evaluate((key) => ({
      stored: localStorage.getItem(key),
      text: document.body.innerText.slice(0, 500),
      url: location.href,
    }), STORAGE_KEY);
    throw new Error(`Fresh journey did not reach Day 0: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
}

async function storedValue<T>(page: Page, key: string): Promise<T> {
  return page.evaluate(({ storageKey, markerKey, namespace }) => {
    const markerRaw = localStorage.getItem(markerKey);
    const physicalKey = markerRaw
      ? `${namespace}:${(JSON.parse(markerRaw) as { sessionId: string }).sessionId}:${storageKey}`
      : storageKey;
    const serialized = localStorage.getItem(physicalKey);
    if (!serialized) throw new Error(`Missing localStorage entry ${storageKey}`);
    return JSON.parse(serialized) as T;
  }, { storageKey: key, markerKey: ACTIVE_DEMO_STORAGE_KEY, namespace: DEMO_NAMESPACE_PREFIX });
}

async function waitForGame(
  page: Page,
  expected: Partial<Pick<GameState, "episodeId" | "status" | "money">> & { completedCount?: number },
): Promise<GameState> {
  await page.waitForFunction(({ key, expectedState, markerKey, namespace }) => {
    const markerRaw = localStorage.getItem(markerKey);
    const physicalKey = markerRaw
      ? `${namespace}:${(JSON.parse(markerRaw) as { sessionId: string }).sessionId}:${key}`
      : key;
    const serialized = localStorage.getItem(physicalKey);
    if (!serialized) return false;
    const game = JSON.parse(serialized) as GameState;
    return (expectedState.episodeId === undefined || game.episodeId === expectedState.episodeId) &&
      (expectedState.status === undefined || game.status === expectedState.status) &&
      (expectedState.money === undefined || game.money === expectedState.money) &&
      (expectedState.completedCount === undefined || game.completed.length === expectedState.completedCount);
  }, { key: STORAGE_KEY, expectedState: expected, markerKey: ACTIVE_DEMO_STORAGE_KEY, namespace: DEMO_NAMESPACE_PREFIX });
  return storedValue<GameState>(page, STORAGE_KEY);
}

async function assertAwaitingLine(page: Page): Promise<void> {
  const stage = page.locator('.audio-stage[data-interaction-phase="awaiting_line"]');
  await stage.waitFor();
  assert.equal(await page.locator(".response-box").count(), 0, "awaiting line must not render a disabled composer");
  const play = page.getByRole("button", { name: /^Play / });
  assert.equal(await play.count(), 1, "awaiting line must expose one dominant play action");
  assert.equal(await play.isEnabled(), true);
  assert.equal(await page.locator('[data-primary-action="true"]:visible').count(), 1, "awaiting line must expose exactly one primary action");
  assert.equal(await page.locator(".day-rail").count(), 0, "active scene must not render the five-day rail");
  const compactProgressCount = await page.locator(".compact-session-progress, .guided-progress").count();
  assert.equal(compactProgressCount, 1, "active scene must render compact progress");
  assert.equal(await page.locator(".phrase-toolkit").getAttribute("open"), null, "phrase help must be collapsed by default");
  assert.equal(await page.locator(".context-details").getAttribute("open"), null, "trip detail must be collapsed by default");
}

async function playCurrentLine(page: Page, fail = false): Promise<void> {
  await assertAwaitingLine(page);
  if (fail) {
    await page.evaluate(() => sessionStorage.setItem("italy-interaction-fail-audio-once", "true"));
  }
  await page.getByRole("button", { name: /^Play / }).click();
  await page.locator('.audio-stage[data-interaction-phase="ready_to_respond"]').waitFor();
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "player-response");
  assert.equal(await composer.isEnabled(), true, "composer must be enabled after playback starts or fails");
  assert.equal(await page.locator('[data-primary-action="true"]:visible').count(), 1, "ready phase must expose exactly one primary action");
  if (fail) {
    const audioFallback = page.locator(".audio-fallback");
    await audioFallback.waitFor();
    assert.match(await audioFallback.innerText(), /Audio could not play/);
    assert.match(await page.locator(".operational-failure-banner").innerText(), /AUDIO_PLAYBACK_FAILED/);
    assert.equal(await page.locator(".transcript").isVisible(), true);
  }
}

async function captureEvidence(
  page: Page,
  viewport: string,
  state: string,
): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll("audio").forEach((audio) => audio.pause());
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  });
  await page.waitForTimeout(150);
  await page.screenshot({ fullPage: true, animations: "disabled" });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: join(evidenceRoot, `${viewport}-${state}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

async function assertPrimaryInViewport(page: Page, label: string): Promise<void> {
  await page.waitForFunction(() => {
    const element = document.querySelector<HTMLElement>('[data-primary-action="true"]');
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }, undefined, { timeout: 2_000 }).catch(() => undefined);
  const geometry = await page.locator('[data-primary-action="true"]:visible').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: window.innerHeight };
  });
  assert.equal(
    geometry.top >= 0 && geometry.bottom <= geometry.height,
    true,
    `${label}: primary action must be in the viewport (${JSON.stringify(geometry)})`,
  );
}

async function assertReviewContract(page: Page, expectedNext: string, expectedTerms: readonly RegExp[]): Promise<void> {
  const sections = await page.locator("[data-review-section]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-review-section")),
  );
  assert.deepEqual(sections, [
    "objective-result",
    "useful-phrasing",
    "pocket-deck-effect",
    "understood-intent",
    "world-consequence",
    "next-action",
  ]);
  const reviewText = await page.locator(".outcome-card").innerText();
  for (const term of expectedTerms) assert.match(reviewText, term);
  assert.equal(await page.locator(".world-panel").count(), 0, "resolved review must remove the active World panel");
  const primary = page.locator('[data-primary-action="true"]:visible');
  assert.equal(await primary.count(), 1, "resolved phase must expose exactly one primary action");
  assert.match(await primary.innerText(), new RegExp(expectedNext, "i"));
  assert.equal(await page.locator('[data-pocket-deck-state="available"]').count(), 1, "earned evidence must remain uncarried until selected");
}

async function assertFocusedControlVisible(page: Page, label: string): Promise<void> {
  const focused = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return { visible: false, label: "none" };
    const hiddenDetails = element.closest("details:not([open])");
    const isVisibleSummary = hiddenDetails?.querySelector(":scope > summary") === element;
    return {
      visible: element.getClientRects().length > 0 && (!hiddenDetails || isVisibleSummary),
      label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
    };
  });
  assert.equal(focused.visible, true, `${label}: focus entered hidden control ${focused.label}`);
}

async function submitReadyResponse(page: Page, response: string, duplicate = false): Promise<void> {
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.fill(response);
  const submit = page.locator(".send-button");
  assert.equal(await submit.isEnabled(), true);
  if (duplicate) {
    await submit.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  } else {
    await submit.click();
  }
}

async function respondToTurn(
  page: Page,
  response: string,
  next: "line" | "outcome" | "teaching",
  options: { failAudio?: boolean; duplicateSubmit?: boolean } = {},
): Promise<void> {
  await playCurrentLine(page, options.failAudio);
  await submitReadyResponse(page, response, options.duplicateSubmit);
  if (next === "line") {
    await assertAwaitingLine(page);
  } else if (next === "outcome") {
    await page.locator(".outcome-card").waitFor();
  } else {
    await page.getByRole("region", { name: "Italian quick refresher" }).waitFor();
  }
}

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.equal(geometry.document <= geometry.viewport, true, `${label}: document overflow`);
  assert.equal(geometry.body <= geometry.viewport, true, `${label}: body overflow`);
}

async function ordinaryDayZeroAndOne(page: Page, label: string): Promise<void> {
  await freshJourney(page);
  const viewport = label.startsWith("390") ? "390x844" : "1440x900";
  await page.locator(".scene-objective").waitFor();
  assert.match(await page.locator(".scene-objective").innerText(), /Check in and find your room/i);
  await assertPrimaryInViewport(page, `${viewport} Day 0 awaiting`);
  await captureEvidence(page, viewport, "day-00-awaiting-line");

  await playCurrentLine(page);
  await assertPrimaryInViewport(page, `${viewport} Day 0 ready`);
  await captureEvidence(page, viewport, "day-00-ready-to-respond");

  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.fill("Fuscoletti. Ho una prenotazione.");
  const beforeHelp = await storedValue<GameState>(page, STORAGE_KEY);
  const phraseToolkit = page.locator(".phrase-toolkit");
  await phraseToolkit.locator(":scope > summary").click();
  assert.equal(await page.locator(".phrase-grid-relevant button:visible").count() <= 3, true);
  assert.equal(await page.locator(".phrase-grid-full button:visible").count(), 0, "full phrase library must stay behind a second disclosure");
  const phraseTrigger = page.locator(".phrase-grid-relevant button").first();
  await phraseTrigger.click();
  await page.getByRole("region", { name: "Italian quick refresher" }).waitFor();
  assert.equal(await composer.isEnabled(), true, "opening phrase help must not disable the composer");
  assert.equal(await page.locator(".send-button").isEnabled(), true, "opening phrase help must not disable Respond");
  assert.equal(await page.locator('[data-primary-action="true"]:visible').count(), 1);
  const afterHelp = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(authoritativeSnapshot(afterHelp), authoritativeSnapshot(beforeHelp), "phrase help must preserve the pending turn and authoritative state");
  await captureEvidence(page, viewport, "contextual-phrase-help");

  assert.equal(await page.getByRole("button", { name: "Close refresher" }).evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press("Escape");
  await page.getByRole("region", { name: "Italian quick refresher" }).waitFor({ state: "detached" });
  assert.equal(await phraseTrigger.evaluate((button) => document.activeElement === button), true, "Escape must return focus to phrase trigger");
  await phraseTrigger.click();
  await page.getByRole("button", { name: "Close refresher" }).click();
  await page.getByRole("region", { name: "Italian quick refresher" }).waitFor({ state: "detached" });
  assert.equal(await phraseTrigger.evaluate((button) => document.activeElement === button), true, "touch close must return focus to phrase trigger");

  await submitReadyResponse(page, "Fuscoletti. Ho una prenotazione.");
  await assertAwaitingLine(page);
  const intermediate = await waitForGame(page, { episodeId: "day-00", status: "active", completedCount: 0 });
  assert.equal(intermediate.hotelKey, true);
  assert.equal(intermediate.keyCustody.hotel, "held");
  assert.equal(intermediate.outcome, null);
  assert.match(await page.locator(".history-strip").innerText(), /Listen for the room and floor/i);
  assert.equal(await page.getByText(/Day complete/i).count(), 0);
  await captureEvidence(page, viewport, "day-00-intermediate-key");
  await respondToTurn(page, "Camera dodici, primo piano. Grazie.", "outcome");

  let game = await waitForGame(page, { episodeId: "day-00", status: "resolved", completedCount: 1 });
  assert.deepEqual(game.completed, ["day-00"]);
  assert.equal(game.episodeResults["day-00"]?.length, 1);
  assert.equal(game.pendingOutcome, null);
  await assertReviewContract(page, "Continue to Day 1", [
    /Room 12/i,
    /Ho una prenotazione/i,
    /Evidence is available/i,
  ]);
  await captureEvidence(page, viewport, "day-00-completion-review");

  const reviewSeason = page.getByRole("button", { name: "Review the season" });
  await reviewSeason.click();
  await page.getByRole("dialog", { name: "All 31 practical sessions" }).waitFor();
  assert.equal(await page.locator(".admin-modal").count(), 0, "traveler season review must never open Admin");
  assert.equal(await page.getByText("Your rehearsal season", { exact: true }).count(), 1);
  await captureEvidence(page, viewport, "traveler-season-overview");
  await page.keyboard.press("Shift+Tab");
  await assertFocusedControlVisible(page, `${viewport} season overview reverse tab`);
  assert.equal(await page.locator(".season-overview").evaluate((dialog) => dialog.contains(document.activeElement)), true, "season overview must contain keyboard focus");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "All 31 practical sessions" }).waitFor({ state: "detached" });
  assert.equal(await reviewSeason.evaluate((button) => document.activeElement === button), true, "season overview close must restore focus");

  await page.getByRole("button", { name: "Continue to Day 1" }).click();
  await assertAwaitingLine(page);
  await respondToTurn(page, "Sono Michael. Sono qui per la chiave.", "line");
  await respondToTurn(page, "La porta verde, primo piano. Grazie.", "outcome");

  game = await waitForGame(page, { episodeId: "day-01", status: "resolved", completedCount: 2 });
  assert.deepEqual(game.completed, ["day-00", "day-01"]);
  assert.equal(game.episodeResults["day-01"]?.length, 1);
  assert.equal(game.apartmentKey, true);
  assert.equal(game.pendingOutcome, null);
  await page.locator(".compact-session-progress").filter({ hasText: "2 of 31" }).waitFor();
  await assertReviewContract(page, "Return to season overview", [
    /Apartment key · green door · first floor/i,
    /Sono qui per la chiave/i,
    /Evidence is available/i,
  ]);
  await captureEvidence(page, viewport, "day-01-completion-review");

  await page.getByRole("button", { name: "Carry this into my Pocket Deck" }).click();
  await page.locator('[data-pocket-deck-state="strengthened"]').waitFor();
  assert.match(await page.locator(".pocket-deck-effect").innerText(), /existing Pocket Deck card was strengthened/i);
  await assertNoHorizontalOverflow(page, label);
}

async function dayThreeTakeaway(page: Page, viewport: "1440x900" | "390x844", failAudio = false): Promise<void> {
  await selectAdminDay(page, 3);
  await respondToTurn(page, "Vorrei un espresso.", "line", { failAudio });
  await playCurrentLine(page);
  await submitReadyResponse(page, "vorrei un espresso da portare");
  await assertAwaitingLine(page);
  const preference = await waitForGame(page, { episodeId: "day-03", status: "active", money: 9160 });
  assert.equal(preference.turnId, "d03_03_pay");
  assert.equal(preference.verifiedFacts.preferenceSelected, "takeaway");
  await captureEvidence(page, viewport, "day-03-takeaway-payment");

  await respondToTurn(page, "Pago con la carta.", "outcome", { duplicateSubmit: true });
  let game = await waitForGame(page, { episodeId: "day-03", status: "resolved", money: 8960, completedCount: 4 });
  assert.equal(game.outcome?.id, "D03-O3");
  assert.equal(game.episodeResults["day-03"]?.length, 1);
  assert.equal(game.episodeResults["day-03"]?.[0]?.verifiedFacts.preferenceSelected, "takeaway");
  assert.equal(game.episodeResults["day-03"]?.[0]?.verifiedFacts.priceConfirmed, true);
  await assertReviewContract(page, "Continue to Day 4", [
    /Takeaway · −€2.00/i,
    /takeaway espresso/i,
    /takeaway choice/i,
  ]);
  await captureEvidence(page, viewport, "day-03-takeaway-completion");

  const snapshot = authoritativeSnapshot(game);
  await dispatchRepeatedAudioEvents(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".outcome-card").waitFor();
  game = await waitForGame(page, { episodeId: "day-03", status: "resolved", money: 8960, completedCount: 4 });
  assert.deepEqual(authoritativeSnapshot(game), snapshot);
  assert.equal(game.episodeResults["day-03"]?.length, 1);
}

async function keyboardOnlyDayZero(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshJourney(page);
  await page.locator("body").click({ position: { x: 1, y: 1 } });

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    await assertFocusedControlVisible(page, `keyboard awaiting ${index}`);
    if (await page.getByRole("button", { name: /^Play / }).evaluate((button) => document.activeElement === button)) break;
  }
  assert.equal(await page.getByRole("button", { name: /^Play / }).evaluate((button) => document.activeElement === button), true, "keyboard path must reach Play");
  await page.keyboard.press("Enter");
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.waitFor();
  assert.equal(await composer.evaluate((field) => document.activeElement === field), true, "playback must move focus to response");

  await page.keyboard.press("Shift+Tab");
  const help = page.getByRole("button", { name: /Teach me a phrase/ });
  assert.equal(await help.evaluate((button) => document.activeElement === button), true, "keyboard path must reach phrase help");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Close refresher" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await help.evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press("Tab");
  await composer.fill("Fuscoletti. Ho una prenotazione.");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".send-button").evaluate((button) => document.activeElement === button), true, "keyboard path must reach Respond");
  await page.keyboard.press("Enter");

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    await assertFocusedControlVisible(page, `keyboard second line ${index}`);
    if (await page.getByRole("button", { name: /^Play / }).evaluate((button) => document.activeElement === button)) break;
  }
  await page.keyboard.press("Enter");
  await composer.fill("Camera dodici, primo piano. Grazie.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.locator(".outcome-card").waitFor();

  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");
    await assertFocusedControlVisible(page, `keyboard outcome ${index}`);
    const continueButton = page.getByRole("button", { name: "Continue to Day 1" });
    if (await continueButton.evaluate((button) => document.activeElement === button)) break;
  }
  assert.equal(await page.getByRole("button", { name: "Continue to Day 1" }).evaluate((button) => document.activeElement === button), true, "keyboard path must reach Continue");
  await page.keyboard.press("Enter");
  await assertAwaitingLine(page);
}

async function selectAdminDay(page: Page, day: number): Promise<void> {
  const episodeId = `day-${String(day).padStart(2, "0")}`;
  await page.getByRole("button", { name: /Admin/ }).click();
  const startDemo = page.getByRole("button", { name: "Start demo walkthrough" });
  if (await startDemo.count()) {
    await startDemo.click();
    await page.locator(".demo-mode-banner").waitFor();
    await page.getByRole("button", { name: "Open conductor" }).click();
  }
  const checkpoint = page.locator("#all-demo-checkpoints button")
    .filter({ hasText: `Day ${day} ·` });
  assert.equal(await checkpoint.count(), 1, `Admin checkpoint for Day ${day}`);
  await checkpoint.click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  await page.getByRole("button", { name: "Open conductor" }).click();
  await page.getByRole("button", { name: "Play this checkpoint" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  await waitForGame(page, { episodeId: episodeId as GameState["episodeId"], status: "active" });
}

function authoritativeSnapshot(game: GameState) {
  return {
    episodeId: game.episodeId,
    turnId: game.turnId,
    money: game.money,
    completed: game.completed,
    inventory: game.inventory,
    hotelKey: game.hotelKey,
    apartmentKey: game.apartmentKey,
    knownFacts: game.knownFacts,
    commitments: game.commitments,
    worldEvents: game.worldEvents,
    outcome: game.outcome,
    episodeResults: game.episodeResults,
  };
}

function evidenceIds(deck: StoredDeck): string[] {
  return Object.values(deck.practiceEvidenceByCardId ?? {}).flat().map((evidence) => evidence.id);
}

async function dispatchRepeatedAudioEvents(page: Page): Promise<void> {
  await page.locator("audio").evaluate((audio) => {
    audio.dispatchEvent(new Event("play"));
    audio.dispatchEvent(new Event("ended"));
    audio.dispatchEvent(new Event("ended"));
    audio.dispatchEvent(new Event("pause"));
  });
}

const executablePath = await firstAvailable(chromeCandidates);
await assertQaPortAvailable();
await mkdir(evidenceRoot, { recursive: true });
const profileDir = await mkdtemp(join(tmpdir(), "italy-interaction-qa-"));
let server: ChildProcess | null = null;
let context: BrowserContext | null = null;
let serverOutput = "";

try {
  server = spawn(
    process.execPath,
    [resolve(root, "node_modules/vinext/dist/cli.js"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(server, () => serverOutput);

  context = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  await installMediaControl(context);
  const page = context.pages()[0] ?? await context.newPage();
  const consoleFailures: string[] = [];
  const responseFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      consoleFailures.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleFailures.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) responseFailures.push(`${response.status()} ${response.url()}`);
  });

  await ordinaryDayZeroAndOne(page, "1440x900 ordinary Day 0-1");
  await dayThreeTakeaway(page, "1440x900");
  await page.setViewportSize({ width: 390, height: 844 });
  await ordinaryDayZeroAndOne(page, "390x844 ordinary Day 0-1");
  await dayThreeTakeaway(page, "390x844", true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await keyboardOnlyDayZero(page);

  await selectAdminDay(page, 4);
  const beforeFallback = await storedValue<GameState>(page, STORAGE_KEY);
  await respondToTurn(page, "I need one chair and one umbrella", "teaching");
  const afterFallback = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(authoritativeSnapshot(afterFallback), authoritativeSnapshot(beforeFallback));
  assert.equal(await page.getByRole("region", { name: "Italian quick refresher" }).count(), 1);
  const guided = await storedValue<{ refresherOpened: boolean; status: string }>(page, GUIDED_SESSION_STORAGE_KEY);
  assert.equal(guided.refresherOpened, true);
  assert.equal(guided.status, "in_progress");
  await page.getByRole("button", { name: /Close and write my response/ }).click();
  const fallbackComposer = page.getByRole("textbox", { name: "Your response" });
  assert.equal(await fallbackComposer.isEnabled(), true);
  assert.equal(await fallbackComposer.inputValue(), "");
  await submitReadyResponse(page, "Mi servono un lettino e un ombrellone.");
  await assertAwaitingLine(page);

  await selectAdminDay(page, 13);
  await respondToTurn(page, "Ci sono due problemi: cappuccino e spremuta.", "line");
  await respondToTurn(page, "Va bene, grazie.", "line");
  await respondToTurn(page, "Pago con la carta.", "outcome", { duplicateSubmit: true });
  let game = await waitForGame(page, { episodeId: "day-13", status: "resolved", money: 1360, completedCount: 14 });
  assert.equal(game.outcome?.id, "E3-O1");
  assert.equal(game.episodeResults["day-13"]?.length, 1);
  const beforeAudioEvents = authoritativeSnapshot(game);
  await dispatchRepeatedAudioEvents(page);
  game = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(authoritativeSnapshot(game), beforeAudioEvents);

  const carry = page.getByRole("button", { name: "Carry this into my Pocket Deck" });
  await carry.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(({ key, markerKey, namespace }) => {
    const markerRaw = localStorage.getItem(markerKey);
    const physicalKey = markerRaw
      ? `${namespace}:${(JSON.parse(markerRaw) as { sessionId: string }).sessionId}:${key}`
      : key;
    const serialized = localStorage.getItem(physicalKey);
    if (!serialized) return false;
    const deck = JSON.parse(serialized) as StoredDeck;
    return Object.values(deck.practiceEvidenceByCardId ?? {}).flat().length === 1;
  }, { key: POCKET_DECK_STORAGE_KEY, markerKey: ACTIVE_DEMO_STORAGE_KEY, namespace: DEMO_NAMESPACE_PREFIX });
  let deck = await storedValue<StoredDeck>(page, POCKET_DECK_STORAGE_KEY);
  assert.equal(new Set(evidenceIds(deck)).size, 1);

  await selectAdminDay(page, 2);
  await respondToTurn(page, "Vorrei pane, formaggio e acqua.", "line", { failAudio: true });
  await respondToTurn(page, "Solo questo, senza sacchetto.", "line");
  await respondToTurn(page, "Pago con la carta.", "outcome", { duplicateSubmit: true });
  game = await waitForGame(page, { episodeId: "day-02", status: "resolved", money: 9160, completedCount: 3 });
  assert.equal(game.outcome?.id, "D02-O1");
  assert.equal(game.inventory.filter((item) => ["Bread", "Cheese", "Water"].includes(item)).length, 3);
  assert.equal(game.episodeResults["day-02"]?.length, 1);
  const dayTwoSnapshot = authoritativeSnapshot(game);
  await dispatchRepeatedAudioEvents(page);
  game = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(authoritativeSnapshot(game), dayTwoSnapshot);

  await selectAdminDay(page, 30);
  await respondToTurn(page, "Ecco tutte le chiavi.", "line");
  await respondToTurn(page, "È tutto a posto?", "line");
  await respondToTurn(page, "Parto domani mattina.", "outcome", { duplicateSubmit: true });
  game = await waitForGame(page, { episodeId: "day-30", status: "complete", completedCount: 31 });
  assert.equal(game.outcome?.id, "D30-O1");
  assert.equal(game.pendingOutcome, null);
  assert.equal(game.episodeResults["day-30"]?.length, 1);
  assert.equal(game.seasonCompletion?.attempt, 1);
  assert.equal(new Set(game.completed).size, 31);
  const completedSnapshot = authoritativeSnapshot(game);
  await dispatchRepeatedAudioEvents(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".outcome-card").waitFor();
  game = await waitForGame(page, { episodeId: "day-30", status: "complete", completedCount: 31 });
  assert.deepEqual(authoritativeSnapshot(game), completedSnapshot);
  assert.equal(game.episodeResults["day-30"]?.length, 1);
  assert.equal(game.seasonCompletion?.attempt, 1);

  deck = await storedValue<StoredDeck>(page, POCKET_DECK_STORAGE_KEY);
  assert.equal(evidenceIds(deck).length, new Set(evidenceIds(deck)).size);
  const expectedAudioWarnings = consoleFailures.filter((entry) =>
    entry.includes("AUDIO_PLAYBACK_FAILED") && entry.includes("play-rehearsal-line")
  );
  const unexpectedConsoleFailures = consoleFailures.filter((entry) => !expectedAudioWarnings.includes(entry));
  assert.equal(expectedAudioWarnings.length, 2, "Both injected audio failures must emit structured warnings.");
  assert.deepEqual(unexpectedConsoleFailures, [], `Unexpected browser console failures:\n${unexpectedConsoleFailures.join("\n")}`);
  assert.deepEqual(responseFailures, [], `Failed browser responses:\n${responseFailures.join("\n")}`);

  console.log("Interaction acceptance passed:");
  console.log("- calm Day 0 -> Day 1 hierarchy, truthful intermediate-key state, and compact reviews at 1440x900 and 390x844");
  console.log("- exact Day 3 owner phrase completed the takeaway path at both viewports with preference, reload, and duplicate protection");
  console.log("- relevant phrase help closed with keyboard and touch without changing the pending turn");
  console.log("- traveler season overview remained separate from Admin and trapped keyboard focus");
  console.log("- keyboard-only Play, response, help, Respond, review, and Continue path passed");
  console.log("- English fallback preserved the pending Day 4 turn and world state");
  console.log("- three-turn Day 13 and Day 30 resolved without audio ended");
  console.log("- rejected audio remained operable through Day 2 completion");
  console.log("- duplicate submits, audio events, reload, and Pocket Deck carry stayed idempotent");
  console.log(`- visual evidence ${evidenceRoot}`);
  console.log(`- isolated origin ${baseUrl} with temporary profile ${profileDir}`);
} finally {
  await context?.close().catch(() => undefined);
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
}
