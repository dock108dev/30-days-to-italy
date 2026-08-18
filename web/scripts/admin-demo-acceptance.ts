import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";

import { canonicalPreEpisodeState } from "../app/admin/canonical-demo";
import { ACTIVE_DEMO_STORAGE_KEY, DEMO_NAMESPACE_PREFIX } from "../app/persistence/session";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { createDefaultGuidedBeachSession } from "../app/guided/model";
import { beginGuidedBeachSession } from "../app/guided/engine";
import { GUIDED_SESSION_STORAGE_KEY } from "../app/guided/persistence";
import { createDefaultLifecycleState } from "../app/lifecycle/model";
import { LIFECYCLE_STORAGE_KEY } from "../app/lifecycle/persistence";
import {
  applyPocketDeckPracticeEvidence,
  createDefaultPocketDeckState,
  type PocketDeckPracticeEvidence,
  type PocketDeckState,
} from "../app/pocket-deck/model";
import { CORE_POCKET_DECK_CARD_IDS } from "../app/pocket-deck/catalog";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3103;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = resolve(root, "../../italian-pilot-evidence/slice-03-20260815");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

type StorageSnapshot = Record<string, string>;
type DemoMarker = { sessionId: string };

async function firstAvailable(paths: readonly string[]): Promise<string> {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next local Chromium runtime.
    }
  }
  throw new Error("No Chromium browser is available. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.");
}

async function assertQaPortAvailable(): Promise<void> {
  await new Promise<void>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", (error) => reject(new Error(`The isolated QA origin ${baseUrl} is unavailable: ${error.message}`)));
    server.listen(port, "127.0.0.1", () => server.close((error) => error ? reject(error) : resolvePort()));
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
      // The production server is still starting.
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
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value(this: HTMLMediaElement) { this.dispatchEvent(new Event("pause")); },
    });
  });
}

function ownerDeck(): PocketDeckState {
  const evidence: PocketDeckPracticeEvidence = {
    id: "season:day-00:attempt-1:hotel-reservation",
    cardId: "hotel-reservation",
    source: "season-episode",
    episodeId: "day-00",
    attempt: 1,
    outcomeId: "E1-O1",
    practicedMoves: ["identify"],
    refresherApplied: false,
    refresherMethod: null,
    quantityClarified: false,
    priceConfirmed: false,
    normalReplayCount: 1,
    carefulReplayCount: 0,
    transcriptRevealCount: 0,
  };
  const practiced = applyPocketDeckPracticeEvidence(
    createDefaultPocketDeckState(),
    evidence,
    CORE_POCKET_DECK_CARD_IDS,
  );
  return {
    ...practiced,
    pinnedCardIds: ["hotel-reservation"],
    recentCardIds: ["hotel-reservation"],
  };
}

function syntheticOwnerRecords(): StorageSnapshot {
  const profile = {
    ...createDefaultTripProfile(new Date("2026-08-15T12:00:00.000Z")),
    departureDate: "2026-09-14",
    regionLabel: "Synthetic owner state · do not mutate",
  };
  return {
    [STORAGE_KEY]: JSON.stringify(canonicalPreEpisodeState(initialState(), "day-02")),
    [TRIP_PROFILE_STORAGE_KEY]: JSON.stringify(profile),
    [LIFECYCLE_STORAGE_KEY]: JSON.stringify(createDefaultLifecycleState()),
    [GUIDED_SESSION_STORAGE_KEY]: JSON.stringify(beginGuidedBeachSession(createDefaultGuidedBeachSession())),
    [POCKET_DECK_STORAGE_KEY]: JSON.stringify(ownerDeck()),
    "synthetic-unknown-owner-record": "opaque-owner-bytes:001",
  };
}

async function snapshotLocalStorage(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key) ?? ""]),
  ));
}

async function seedOwner(page: Page): Promise<StorageSnapshot> {
  const records = syntheticOwnerRecords();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((values) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, records);
  await page.goto("about:blank");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByText("Day 2", { exact: true }).first().waitFor();
  return snapshotLocalStorage(page);
}

async function demoDomainValue<T>(page: Page, logicalKey: string): Promise<T> {
  return page.evaluate(({ markerKey, namespace, key }) => {
    const markerRaw = localStorage.getItem(markerKey);
    if (!markerRaw) throw new Error("Active demo marker is missing.");
    const marker = JSON.parse(markerRaw) as DemoMarker;
    const raw = localStorage.getItem(`${namespace}:${marker.sessionId}:${key}`);
    if (!raw) throw new Error(`Demo domain ${key} is missing.`);
    return JSON.parse(raw) as T;
  }, { markerKey: ACTIVE_DEMO_STORAGE_KEY, namespace: DEMO_NAMESPACE_PREFIX, key: logicalKey });
}

async function assertOwnerRecordsUnchanged(page: Page, owner: StorageSnapshot): Promise<void> {
  const current = await snapshotLocalStorage(page);
  for (const [key, value] of Object.entries(owner)) {
    assert.equal(current[key], value, `Owner localStorage record ${key} changed during Demo mode.`);
  }
}

async function captureBoth(page: Page, state: string, focus?: Locator): Promise<void> {
  for (const [label, size] of [
    ["1440x900", { width: 1440, height: 900 }],
    ["390x844", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(size);
    if (focus) await focus.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(evidenceRoot, `${label}-${state}.png`) });
    const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.equal(overflow.scroll <= overflow.width, true, `${label} ${state} has horizontal overflow.`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function openAdmin(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Admin/ }).click();
  await page.getByRole("dialog", { name: "Demo conductor" }).waitFor();
}

async function playLineAndRespond(page: Page, response: string, outcome = false): Promise<void> {
  await page.getByRole("button", { name: /^Play / }).click();
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.waitFor();
  await composer.fill(response);
  await page.getByRole("button", { name: "Respond" }).click();
  if (outcome) await page.locator(".outcome-card").waitFor();
  else await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
}

async function advanceCurrent(page: Page, doubleDispatch = false): Promise<void> {
  await openAdmin(page);
  const advance = page.getByRole("button", { name: /Advance with canonical result/ });
  await advance.waitFor();
  if (doubleDispatch) {
    await advance.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  } else {
    await advance.click();
  }
  await page.locator(".demo-mode-banner").filter({ hasText: "Canonically simulated" }).waitFor();
}

async function nextCheckpoint(page: Page): Promise<void> {
  await openAdmin(page);
  await page.getByRole("button", { name: "Next checkpoint" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
}

async function directCheckpoint(page: Page, day: number): Promise<void> {
  await openAdmin(page);
  const episodeId = `day-${String(day).padStart(2, "0")}`;
  const button = page.locator("#all-demo-checkpoints button").filter({ hasText: `Day ${day} ·` });
  assert.equal(await button.count(), 1, `Direct checkpoint ${episodeId} must be unique.`);
  await button.click();
  await page.locator('.demo-mode-banner[data-demo-checkpoint="' + episodeId + '"]').waitFor();
}

const executablePath = await firstAvailable(chromeCandidates);
await assertQaPortAvailable();
await mkdir(evidenceRoot, { recursive: true });
const profileDir = await mkdtemp(join(tmpdir(), "italy-admin-demo-qa-"));
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

  const ownerBefore = await seedOwner(page);
  await openAdmin(page);
  await captureBoth(page, "admin-before-demo");

  await page.getByRole("button", { name: "Reset owner journey" }).click();
  await page.getByRole("alertdialog", { name: "Confirm owner journey reset" }).waitFor();
  await captureBoth(page, "reset-owner-confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  assert.deepEqual(await snapshotLocalStorage(page), ownerBefore, "Cancelling owner reset must change nothing.");

  const walkthroughStartedAt = Date.now();
  await page.getByRole("button", { name: "Start demo walkthrough" }).click();
  await page.locator('.demo-mode-banner[data-demo-checkpoint="day-00"]').waitFor();
  assert.match(await page.locator(".demo-mode-banner").innerText(), /Demo mode.*checkpoint 1 of 32/is);
  await assertOwnerRecordsUnchanged(page, ownerBefore);

  await openAdmin(page);
  await captureBoth(page, "fresh-demo-conductor");
  await page.getByRole("button", { name: "Play this checkpoint" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("textbox", { name: "Your response" }).waitFor();
  await captureBoth(page, "demo-banner-active-scene");
  await page.getByRole("textbox", { name: "Your response" }).fill("Fuscoletti. Ho una prenotazione.");
  await page.getByRole("button", { name: "Respond" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  await playLineAndRespond(page, "Camera dodici, primo piano. Grazie.", true);
  await page.getByRole("button", { name: "Carry this into my Pocket Deck" }).click();
  await page.locator(".demo-mode-banner").filter({ hasText: "Played normally" }).waitFor();
  await assertOwnerRecordsUnchanged(page, ownerBefore);

  await nextCheckpoint(page);
  await advanceCurrent(page);
  await captureBoth(page, "checkpoint-canonical-simulation");
  await nextCheckpoint(page);
  await openAdmin(page);
  await page.locator("#all-demo-checkpoints").scrollIntoViewIfNeeded();
  await captureBoth(page, "grouped-checkpoint-list");
  await page.getByRole("button", { name: "Close admin" }).click();

  const visited: string[] = ["day-00", "day-01", "day-02"];
  for (let day = 2; day <= 30; day += 1) {
    const episodeId = `day-${String(day).padStart(2, "0")}`;
    if (day > 2) {
      await nextCheckpoint(page);
      visited.push(episodeId);
    }
    await advanceCurrent(page, day === 5);

    if (day === 10) {
      const beforeReload = await demoDomainValue<GameState>(page, STORAGE_KEY);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('.demo-mode-banner[data-demo-checkpoint="day-10"]').waitFor();
      const afterReload = await demoDomainValue<GameState>(page, STORAGE_KEY);
      assert.deepEqual(afterReload, beforeReload, "Reload must resume the exact demo checkpoint state.");

      await openAdmin(page);
      await page.getByRole("button", { name: "Previous checkpoint" }).click();
      await page.locator('.demo-mode-banner[data-demo-checkpoint="day-09"]').waitFor();
      await directCheckpoint(page, 10);
      assert.match(await page.locator(".demo-mode-banner").innerText(), /Canonically simulated/);
    }

    if (day === 11) {
      await openAdmin(page);
      await page.getByRole("button", { name: /Day 19 · no ferry ticket/ }).click();
      await page.locator(".demo-mode-banner").filter({ hasText: "Conditional truth preview" }).waitFor();
      await page.getByRole("button", { name: "Return to checkpoint" }).click();
      await page.locator('.demo-mode-banner[data-demo-checkpoint="day-11"]').waitFor();
      assert.match(await page.locator(".demo-mode-banner").innerText(), /Canonically simulated/);
    }

    if (day === 29) {
      await openAdmin(page);
      assert.equal(await page.getByRole("button", { name: "Open Trip Mode", exact: true }).count(), 0);
      const tripCheckpoint = page.locator("#all-demo-checkpoints button").filter({ hasText: "Open the real Trip Mode deck" });
      assert.equal(await tripCheckpoint.isDisabled(), true, "Trip checkpoint must stay locked before Day 30 completion.");
      await page.getByRole("button", { name: "Close admin" }).click();
    }
  }

  assert.deepEqual(visited, Array.from({ length: 31 }, (_, day) => `day-${String(day).padStart(2, "0")}`));
  const completed = await demoDomainValue<GameState>(page, STORAGE_KEY);
  assert.equal(completed.status, "complete");
  assert.equal(completed.completed.length, 31);
  assert.equal(new Set(completed.completed).size, 31);
  assert.deepEqual(completed.keyCustody, { hotel: "returned", apartment: "returned" });
  assert.ok(completed.departurePlan);
  assert.ok(completed.seasonCompletion);

  await openAdmin(page);
  await page.getByRole("button", { name: "Open Trip Mode", exact: true }).click();
  await page.getByRole("heading", { name: "The words you need, within reach." }).waitFor();
  assert.equal(await page.locator('.demo-mode-banner[data-demo-checkpoint="trip"]').count(), 1);
  const tripBoundary = await page.getByRole("region", { name: "Demo Pocket Deck evidence boundary" }).innerText();
  assert.match(tripBoundary, /Core catalog cards are always available/);
  assert.match(tripBoundary, /Demo practiced/);
  assert.match(tripBoundary, /canonically advanced checkpoints add no practice evidence/i);
  await captureBoth(page, "trip-mode-after-day-30");

  const elapsedMs = Date.now() - walkthroughStartedAt;
  assert.ok(elapsedMs <= 15 * 60 * 1000, `Walkthrough took ${(elapsedMs / 1000).toFixed(1)}s, over 15 minutes.`);
  await assertOwnerRecordsUnchanged(page, ownerBefore);

  await openAdmin(page);
  await page.getByRole("button", { name: "Reset demo" }).click();
  const demoResetConfirmation = page.getByRole("alertdialog", { name: "Confirm demo reset" });
  await demoResetConfirmation.waitFor();
  await captureBoth(page, "reset-demo-confirmation", demoResetConfirmation);
  await page.getByRole("button", { name: "Reset demo only" }).click();
  await page.locator('.demo-mode-banner[data-demo-checkpoint="day-00"]').waitFor();
  await assertOwnerRecordsUnchanged(page, ownerBefore);

  await page.getByRole("button", { name: "Exit demo" }).click();
  await page.locator(".demo-mode-banner").waitFor({ state: "detached" });
  await page.getByText("Day 2", { exact: true }).first().waitFor();
  await captureBoth(page, "restored-owner-journey");
  const ownerAfter = await snapshotLocalStorage(page);
  assert.deepEqual(ownerAfter, ownerBefore, "Complete localStorage must exactly match the pre-demo snapshot after exit.");

  assert.deepEqual(consoleFailures, [], `Browser console failures:\n${consoleFailures.join("\n")}`);
  assert.deepEqual(responseFailures, [], `Failed browser responses:\n${responseFailures.join("\n")}`);

  console.log("Admin demo acceptance passed:");
  console.log("- exact owner localStorage matched before and after demo");
  console.log("- visible UI played Day 0 and canonically visited Day 1–30 in order");
  console.log("- reload, Previous/Next, direct entry, conditional preview, and repeated advance passed");
  console.log("- Day 30 produced valid season completion before Trip Mode opened");
  console.log("- demo Pocket Deck labels separated core, carried demo practice, and canonical simulation");
  console.log("- Reset demo touched demo only; owner reset cancellation touched nothing");
  console.log(`- elapsed walkthrough ${(elapsedMs / 1000).toFixed(1)} seconds`);
  console.log("- zero console warnings/errors and zero failed HTTP responses");
  console.log(`- visual evidence ${evidenceRoot}`);
  console.log(`- isolated origin ${baseUrl}; temporary profile deleted after run`);
} finally {
  await context?.close().catch(() => undefined);
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
}
