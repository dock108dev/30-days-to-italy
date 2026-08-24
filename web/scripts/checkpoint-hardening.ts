import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import {
  assertCanonicalCheckpoint,
} from "../app/admin/canonical-demo";
import { submitEpisodeResponse } from "../app/game/engine";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { createDefaultGuidedBeachSession } from "../app/guided/model";
import { GUIDED_SESSION_STORAGE_KEY } from "../app/guided/persistence";
import { createDefaultLifecycleState } from "../app/lifecycle/model";
import { LIFECYCLE_STORAGE_KEY } from "../app/lifecycle/persistence";
import {
  ACTIVE_DEMO_STORAGE_KEY,
  DEMO_NAMESPACE_PREFIX,
} from "../app/persistence/session";
import { createDefaultPocketDeckState, type PocketDeckState } from "../app/pocket-deck/model";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import { EPISODE_IDS, type EpisodeId } from "../app/season/manifest";
import { implementedEpisode } from "../app/season/registry";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3105;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = process.env.ITALY_EVIDENCE_ROOT
  ? resolve(process.env.ITALY_EVIDENCE_ROOT, "checkpoints")
  : resolve(root, "../../italian-pilot-evidence/local/checkpoints");
const machineOutputPath = join(evidenceRoot, "checkpoint-results.json");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

const EXIT_RESPONSE = "Devo andare.";
const PERSISTENCE_DAYS = new Set([0, 8, 14, 21, 27]);
const PHASE_REVIEW_DAYS = new Set([0, 4, 5, 8, 14, 21, 27]);
const requestedCheckpoint = process.env.CHECKPOINT_HARDENING_ONLY;
if (requestedCheckpoint && !EPISODE_IDS.includes(requestedCheckpoint as EpisodeId)) {
  throw new Error(`CHECKPOINT_HARDENING_ONLY must be one of: ${EPISODE_IDS.join(", ")}`);
}
const checkpointIds: readonly EpisodeId[] = requestedCheckpoint && EPISODE_IDS.includes(requestedCheckpoint as EpisodeId)
  ? [requestedCheckpoint as EpisodeId]
  : EPISODE_IDS;

type StorageSnapshot = Record<string, string>;
type DemoMarker = { sessionId: string };
type MatrixRow = {
  checkpoint: EpisodeId;
  phase: string;
  usefulPath: string[];
  helpPath: string;
  exitPath: string;
  exitOutcome: string;
  result: string;
  consequentialStateCheck: string;
  persistenceCheck: string;
  browserStatus: "PASS" | "FAIL";
  defectId: string | null;
  finalDisposition: string;
};
type FailureRecord = {
  checkpoint: EpisodeId;
  response: string;
  expected: string;
  actual: string;
  screenshot: string | null;
  recordedAt: string;
};

const rows: MatrixRow[] = [];
const failures: FailureRecord[] = [];

const DEFECT_IDS_BY_EPISODE: Partial<Record<EpisodeId, string>> = {
  "day-00": "DEF-001, DEF-002",
  "day-01": "DEF-002",
  "day-02": "DEF-001",
  "day-04": "DEF-003, DEF-007, DEF-008",
  "day-05": "DEF-004, DEF-005",
  "day-07": "DEF-005",
  "day-09": "DEF-005, DEF-006",
  "day-10": "DEF-005",
  "day-12": "DEF-005",
  "day-21": "DEF-005",
  "day-22": "DEF-005",
  "day-23": "DEF-005",
  "day-24": "DEF-005",
  "day-25": "DEF-005",
  "day-26": "DEF-005",
  "day-27": "DEF-005",
};

function journeyPhase(day: number): string {
  if (day <= 7) return "Arrival foundation";
  if (day <= 13) return "Independent routines";
  if (day <= 20) return "Recovery and continuity";
  if (day <= 26) return "Familiarity";
  return "Departure and independence";
}

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
      value(this: HTMLMediaElement) {
        this.dispatchEvent(new Event("pause"));
      },
    });
  });
}

function ownerRecords(): StorageSnapshot {
  return {
    [STORAGE_KEY]: JSON.stringify(initialState()),
    [TRIP_PROFILE_STORAGE_KEY]: JSON.stringify(
      createDefaultTripProfile(new Date("2026-08-15T12:00:00.000Z")),
    ),
    [LIFECYCLE_STORAGE_KEY]: JSON.stringify(createDefaultLifecycleState()),
    [GUIDED_SESSION_STORAGE_KEY]: JSON.stringify(createDefaultGuidedBeachSession()),
    [POCKET_DECK_STORAGE_KEY]: JSON.stringify(createDefaultPocketDeckState()),
    "synthetic-slice-04-owner-record": "opaque-owner-bytes:004",
  };
}

async function snapshotLocalStorage(page: Page): Promise<StorageSnapshot> {
  return page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key) ?? ""]),
  ));
}

async function seedOwner(page: Page): Promise<StorageSnapshot> {
  const records = ownerRecords();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((values) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, records);
  await page.goto("about:blank");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  return snapshotLocalStorage(page);
}

async function storedValue<T>(page: Page, logicalKey: string): Promise<T> {
  return page.evaluate(({ markerKey, namespace, key }) => {
    const markerRaw = localStorage.getItem(markerKey);
    const physicalKey = markerRaw
      ? `${namespace}:${(JSON.parse(markerRaw) as DemoMarker).sessionId}:${key}`
      : key;
    const raw = localStorage.getItem(physicalKey);
    if (!raw) throw new Error(`Storage record ${key} is missing.`);
    return JSON.parse(raw) as T;
  }, { markerKey: ACTIVE_DEMO_STORAGE_KEY, namespace: DEMO_NAMESPACE_PREFIX, key: logicalKey });
}

async function assertOwnerRecordsUnchanged(page: Page, owner: StorageSnapshot): Promise<void> {
  const current = await snapshotLocalStorage(page);
  for (const [key, value] of Object.entries(owner)) {
    assert.equal(current[key], value, `Owner record ${key} changed during checkpoint hardening.`);
  }
}

function authoritativeSnapshot(game: GameState) {
  return {
    episodeId: game.episodeId,
    turnId: game.turnId,
    status: game.status,
    money: game.money,
    completed: game.completed,
    inventory: game.inventory,
    hotelKey: game.hotelKey,
    apartmentKey: game.apartmentKey,
    keyCustody: game.keyCustody,
    knownFacts: game.knownFacts,
    commitments: game.commitments,
    worldEvents: game.worldEvents,
    outcome: game.outcome,
    episodeResults: game.episodeResults,
    pendingOutcome: game.pendingOutcome,
    seasonCompletion: game.seasonCompletion,
  };
}

function consequentialSnapshot(game: GameState) {
  return {
    episodeId: game.episodeId,
    status: game.status,
    money: game.money,
    hotelKey: game.hotelKey,
    apartmentKey: game.apartmentKey,
    keyCustody: game.keyCustody,
    inventory: game.inventory,
    busTicket: game.busTicket,
    routeFact: game.routeFact,
    pharmacyItem: game.pharmacyItem,
    rental: game.rental,
    cafeOutcome: game.cafeOutcome,
    ferryMemory: game.ferryMemory,
    laundryStatus: game.laundryStatus,
    transportMode: game.transportMode,
    transportStatus: game.transportStatus,
    transportTicketPrice: game.transportTicketPrice,
    hotWaterStatus: game.hotWaterStatus,
    repairCommitment: game.repairCommitment,
    parcelStatus: game.parcelStatus,
    vendorPreference: game.vendorPreference,
    secondParcelStatus: game.secondParcelStatus,
    beachPlanStatus: game.beachPlanStatus,
    beachWeather: game.beachWeather,
    beachDayPassPaid: game.beachDayPassPaid,
    beachDayPassPrice: game.beachDayPassPrice,
    beachRemedy: game.beachRemedy,
    invitationResponse: game.invitationResponse,
    eventAttendance: game.eventAttendance,
    tablePreference: game.tablePreference,
    repairCreditEligibility: game.repairCreditEligibility,
    repairCreditStatus: game.repairCreditStatus,
    transportPlan: game.transportPlan,
    stayResponse: game.stayResponse,
    commitments: game.commitments,
    checkoutObligations: game.checkoutObligations,
    openIssues: game.openIssues,
    departurePlan: game.departurePlan,
    departureStatus: game.departureStatus,
    completed: game.completed,
    outcome: game.outcome,
    seasonCompletion: game.seasonCompletion,
  };
}

function practiceEvidenceCount(deck: PocketDeckState): number {
  return Object.values(deck.practiceEvidenceByCardId).flat().length;
}

async function openAdmin(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Admin/ }).click();
  await page.getByRole("dialog", { name: "Demo conductor" }).waitFor();
}

async function startDemo(page: Page): Promise<void> {
  await openAdmin(page);
  await page.getByRole("button", { name: "Start demo walkthrough" }).click();
  await page.locator('.demo-mode-banner[data-demo-checkpoint="day-00"]').waitFor();
}

async function selectCheckpoint(page: Page, episodeId: EpisodeId): Promise<GameState> {
  const day = Number(episodeId.slice(4));
  await openAdmin(page);
  const checkpoint = page.locator("#all-demo-checkpoints button").filter({ hasText: `Day ${day} ·` });
  assert.equal(await checkpoint.count(), 1, `${episodeId} must have one conductor entry.`);
  await checkpoint.click();
  await page.locator(`.demo-mode-banner[data-demo-checkpoint="${episodeId}"]`).waitFor();
  await openAdmin(page);
  await page.getByRole("button", { name: "Play this checkpoint" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  const game = await storedValue<GameState>(page, STORAGE_KEY);
  assert.equal(game.episodeId, episodeId);
  assert.equal(game.status, "active");
  return game;
}

async function assertCanonicalEntry(page: Page, episodeId: EpisodeId): Promise<GameState> {
  const definition = implementedEpisode(episodeId);
  assert.ok(definition, `${episodeId} definition must exist.`);
  const game = await storedValue<GameState>(page, STORAGE_KEY);
  assertCanonicalCheckpoint(game, episodeId, false);
  assert.equal(game.turnId, definition.scene.firstTurn);
  assert.equal(game.outcome, null);
  assert.equal(game.seasonCompletion, null);
  assert.deepEqual(game.completed, EPISODE_IDS.slice(0, definition.day));
  assert.equal(await page.locator(".scene-heading h2").innerText(), definition.scene.title);
  assert.match(await page.locator(".day-stamp").innerText(), new RegExp(`Day\\s*${definition.day}`));
  assert.equal(await page.locator(".scene-objective strong").innerText(), definition.scene.objective);
  assert.match(await page.locator(".location-line").innerText(), new RegExp(escapeRegex(definition.scene.location)));
  assert.equal(await page.locator(".speaker-row strong").innerText(), definition.turns[game.turnId].npc);
  assert.equal(await page.locator(".response-box").count(), 0);
  const primary = page.locator('[data-primary-action="true"]:visible');
  assert.equal(await primary.count(), 1, `${episodeId} awaiting state must expose one primary action.`);
  assert.match(
    (await page.getByRole("button", { name: /^Play / }).innerText()).replace(/\s+/g, " ").trim(),
    /^▶ Play the line$/,
  );
  assert.equal(await page.getByRole("button", { name: /^Play / }).isEnabled(), true);
  const deck = await storedValue<PocketDeckState>(page, POCKET_DECK_STORAGE_KEY);
  assert.equal(practiceEvidenceCount(deck), 0, `${episodeId} entry must not forge Pocket Deck practice.`);
  return game;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function playLine(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Play / }).click();
  await page.locator('.audio-stage[data-interaction-phase="ready_to_respond"]').waitFor();
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.waitFor();
  assert.equal(await composer.isEnabled(), true);
  assert.equal(await page.locator('[data-primary-action="true"]:visible').count(), 1);
}

async function exerciseHelp(page: Page, episodeId: EpisodeId, capture: boolean): Promise<void> {
  const before = await storedValue<GameState>(page, STORAGE_KEY);
  const trigger = page.getByRole("button", { name: /Teach me a phrase/ });
  await trigger.click();
  const refresher = page.getByRole("region", { name: "Italian quick refresher" });
  await refresher.waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Your response" }).isEnabled(), true);
  assert.equal(await page.locator('[data-primary-action="true"]:visible').count(), 1);
  const afterOpen = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(
    authoritativeSnapshot(afterOpen),
    authoritativeSnapshot(before),
    `${episodeId} help changed the authoritative pending turn.`,
  );
  if (capture) await captureBoth(page, `${episodeId}-contextual-help`);
  assert.equal(
    await page.getByRole("button", { name: "Close refresher" }).evaluate((button) => document.activeElement === button),
    true,
  );
  await page.keyboard.press("Escape");
  await refresher.waitFor({ state: "detached" });
  assert.equal(await trigger.evaluate((button) => document.activeElement === button), true);
  await trigger.click();
  await page.getByRole("button", { name: "Close refresher" }).tap();
  await refresher.waitFor({ state: "detached" });
  assert.equal(await trigger.evaluate((button) => document.activeElement === button), true);
  const afterClose = await storedValue<GameState>(page, STORAGE_KEY);
  assert.deepEqual(authoritativeSnapshot(afterClose), authoritativeSnapshot(before));
}

async function submit(page: Page, response: string, duplicate = false): Promise<void> {
  const composer = page.getByRole("textbox", { name: "Your response" });
  await composer.fill(response);
  const button = page.getByRole("button", { name: "Respond" });
  assert.equal(await button.isEnabled(), true);
  if (duplicate) {
    await button.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
  } else {
    await button.click();
  }
}

async function ensureReadyForResponse(page: Page): Promise<void> {
  const stage = page.locator(".audio-stage");
  await stage.waitFor();
  const phase = await stage.getAttribute("data-interaction-phase");
  if (phase === "awaiting_line") {
    await playLine(page);
    return;
  }
  assert.equal(phase, "ready_to_respond", `Unexpected interaction phase before response: ${phase}`);
  assert.equal(await page.getByRole("textbox", { name: "Your response" }).isEnabled(), true);
}

async function waitForReview(page: Page): Promise<void> {
  await page.locator(".outcome-card, #guided-session-review").first().waitFor();
}

async function assertReviewContract(page: Page, episodeId: EpisodeId): Promise<void> {
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
  ], `${episodeId} must retain all six truthful review sections in the compact presentation order.`);
  assert.equal(
    await page.locator(".review-details:not([open])").count(),
    1,
    `${episodeId} must keep supporting response evidence collapsed by default.`,
  );
  const primary = page.locator('[data-primary-action="true"]:visible');
  assert.equal(await primary.count(), 1, `${episodeId} review must expose one primary next action.`);
}

async function dispatchRepeatedAudioEvents(page: Page): Promise<void> {
  await page.locator("audio").evaluate((audio) => {
    audio.dispatchEvent(new Event("play"));
    audio.dispatchEvent(new Event("ended"));
    audio.dispatchEvent(new Event("ended"));
    audio.dispatchEvent(new Event("pause"));
  });
}

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.equal(geometry.document <= geometry.viewport, true, `${label}: document overflow.`);
  assert.equal(geometry.body <= geometry.viewport, true, `${label}: body overflow.`);
}

async function captureBoth(page: Page, state: string): Promise<void> {
  for (const [label, viewport] of [
    ["1440x900", { width: 1440, height: 900 }],
    ["390x844", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page, `${label} ${state}`);
    await page.screenshot({ path: join(evidenceRoot, `${label}-${state}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function recordFailure(
  page: Page,
  episodeId: EpisodeId,
  response: string,
  error: unknown,
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshot = join(evidenceRoot, `failure-${episodeId}-${timestamp}.png`);
  let screenshotPath: string | null = screenshot;
  try {
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch {
    screenshotPath = null;
  }
  const actual = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const record: FailureRecord = {
    checkpoint: episodeId,
    response,
    expected: "Checkpoint passes canonical entry, action, help, exit, exactly-once, review, continuation, and persistence contracts.",
    actual,
    screenshot: screenshotPath,
    recordedAt: new Date().toISOString(),
  };
  failures.push(record);
  await writeFile(
    join(evidenceRoot, `failure-${episodeId}-${timestamp}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  await writeMachineOutput();
}

async function writeMachineOutput(): Promise<void> {
  await writeFile(machineOutputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    origin: baseUrl,
    checkpoints: rows,
    failures,
  }, null, 2)}\n`);
  const markdownRows = rows.map((row) => [
    row.checkpoint,
    row.usefulPath.join(" → "),
    row.helpPath,
    `${row.exitPath} → ${row.exitOutcome}`,
    row.result,
    row.consequentialStateCheck,
    row.persistenceCheck,
    row.browserStatus,
    row.defectId ?? "—",
    row.finalDisposition,
  ].map((value) => value.replaceAll("|", "\\|")).join(" | "));
  const matrix = [
    "# Slice 4 checkpoint hardening matrix",
    "",
    `Production-browser origin: \`${baseUrl}\`  `,
    "Profile: automatically deleted temporary Chromium profile  ",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Checkpoint | Useful path | Help path | Exit path | Result | Consequential state | Persistence | Browser | Defect | Final disposition |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...markdownRows.map((row) => `| ${row} |`),
    "",
    "Persistence representatives: Day 0, Day 8, Day 14, Day 21, and Day 27 cover every journey phase. All other rows inherit the complete production-browser, domain-route, and offline gates recorded in validation.md.",
    "",
  ].join("\n");
  await writeFile(join(evidenceRoot, "checkpoint-matrix.md"), matrix);
}

async function runExitPath(page: Page, episodeId: EpisodeId, capture: boolean): Promise<string> {
  const before = await selectCheckpoint(page, episodeId);
  await assertCanonicalEntry(page, episodeId);
  const expected = submitEpisodeResponse(before, EXIT_RESPONSE, () => "expected-exit").state;
  await playLine(page);
  await submit(page, EXIT_RESPONSE, true);
  await waitForReview(page);
  const actual = await storedValue<GameState>(page, STORAGE_KEY);
  assert.equal(actual.outcome?.id, expected.outcome?.id, `${episodeId} exit outcome mismatch.`);
  assert.deepEqual(
    consequentialSnapshot(actual),
    consequentialSnapshot(expected),
    `${episodeId} exit created an unintended world consequence.`,
  );
  assert.equal(actual.pendingOutcome, null);
  await assertReviewContract(page, episodeId);
  const deck = await storedValue<PocketDeckState>(page, POCKET_DECK_STORAGE_KEY);
  assert.equal(practiceEvidenceCount(deck), 0, `${episodeId} exit forged Pocket Deck practice.`);
  const exactlyOnce = authoritativeSnapshot(actual);
  await dispatchRepeatedAudioEvents(page);
  assert.deepEqual(authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY)), exactlyOnce);
  if (capture) await captureBoth(page, `${episodeId}-open-result`);
  return `${actual.outcome?.id ?? "missing"} · ${actual.outcome?.title ?? "missing"}`;
}

async function runUsefulPath(page: Page, episodeId: EpisodeId, day: number): Promise<GameState> {
  const definition = implementedEpisode(episodeId);
  assert.ok(definition);
  await selectCheckpoint(page, episodeId);
  await assertCanonicalEntry(page, episodeId);

  if (PERSISTENCE_DAYS.has(day)) {
    const awaiting = authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
    assert.deepEqual(authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY)), awaiting);
  }
  if (day === 0) await captureBoth(page, `${episodeId}-awaiting-line`);

  await playLine(page);
  if (day === 8) await captureBoth(page, `${episodeId}-ready-to-respond`);
  await page.getByRole("textbox", { name: "Your response" }).fill(definition.canonicalDemo.responses[0]);
  await exerciseHelp(page, episodeId, day === 14);

  if (PERSISTENCE_DAYS.has(day)) {
    const ready = authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
    assert.deepEqual(authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY)), ready);
    await playLine(page);
  }

  for (const [index, response] of definition.canonicalDemo.responses.entries()) {
    if (index > 0) await ensureReadyForResponse(page);
    await submit(page, response, index === definition.canonicalDemo.responses.length - 1);
    if (index < definition.canonicalDemo.responses.length - 1) {
      await page.waitForFunction(({ storageKey, markerKey, namespace, expectedResponse }) => {
        const markerRaw = localStorage.getItem(markerKey);
        if (!markerRaw) return false;
        const marker = JSON.parse(markerRaw) as DemoMarker;
        const raw = localStorage.getItem(`${namespace}:${marker.sessionId}:${storageKey}`);
        if (!raw) return false;
        const saved = JSON.parse(raw) as GameState;
        return saved.status === "active" && saved.lastResponse === expectedResponse;
      }, {
        storageKey: STORAGE_KEY,
        markerKey: ACTIVE_DEMO_STORAGE_KEY,
        namespace: DEMO_NAMESPACE_PREFIX,
        expectedResponse: response,
      });
    }
  }
  await waitForReview(page);
  const game = await storedValue<GameState>(page, STORAGE_KEY);
  assert.equal(game.outcome?.id, definition.canonicalDemo.expectedOutcomeId);
  assert.equal(game.status, episodeId === "day-30" ? "complete" : "resolved");
  assert.equal(game.pendingOutcome, null);
  assert.deepEqual(game.completed, EPISODE_IDS.slice(0, day + 1));
  assertCanonicalCheckpoint(game, episodeId, true);
  assert.equal(game.episodeResults[episodeId]?.length, 1);
  await assertReviewContract(page, episodeId);
  const deck = await storedValue<PocketDeckState>(page, POCKET_DECK_STORAGE_KEY);
  assert.equal(practiceEvidenceCount(deck), 0, `${episodeId} useful result was carried without traveler action.`);

  const once = authoritativeSnapshot(game);
  await dispatchRepeatedAudioEvents(page);
  assert.deepEqual(authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY)), once);

  if (PERSISTENCE_DAYS.has(day)) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReview(page);
    assert.deepEqual(authoritativeSnapshot(await storedValue<GameState>(page, STORAGE_KEY)), once);
  }
  if (PHASE_REVIEW_DAYS.has(day)) await captureBoth(page, `${episodeId}-completion-review`);

  if (day < 30) {
    const nextId = EPISODE_IDS[day + 1];
    const nextDefinition = implementedEpisode(nextId);
    assert.ok(nextDefinition);
    const primary = page.locator('[data-primary-action="true"]:visible');
    assert.match(await primary.innerText(), new RegExp(`Continue to Day ${day + 1}`));
    await primary.click();
    await page.locator(`.demo-mode-banner[data-demo-checkpoint="${nextId}"]`).waitFor();
    await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
    assert.equal((await storedValue<GameState>(page, STORAGE_KEY)).episodeId, nextId);
    if (day === 20) {
      await openAdmin(page);
      await captureBoth(page, `${episodeId}-admin-conductor-return`);
      await page.getByRole("button", { name: "Close admin" }).click();
    }
  } else {
    assert.match(await page.locator('[data-primary-action="true"]:visible').innerText(), /Open Trip Mode/);
    await captureBoth(page, `${episodeId}-completion`);
  }
  return game;
}

async function hardenCheckpoint(page: Page, episodeId: EpisodeId): Promise<void> {
  const definition = implementedEpisode(episodeId);
  assert.ok(definition);
  const day = definition.day;
  let activeResponse = EXIT_RESPONSE;
  try {
    const exit = await runExitPath(page, episodeId, day === 27);
    activeResponse = definition.canonicalDemo.responses.join(" | ");
    const useful = await runUsefulPath(page, episodeId, day);
    rows.push({
      checkpoint: episodeId,
      phase: journeyPhase(day),
      usefulPath: [...definition.canonicalDemo.responses],
      helpPath: "PASS · same pending turn; Escape and touch close restored focus",
      exitPath: EXIT_RESPONSE,
      exitOutcome: exit,
      result: `${useful.outcome?.id ?? "missing"} · ${useful.outcome?.title ?? "missing"}`,
      consequentialStateCheck: "PASS · browser result matched episode-owned authoritative world state",
      persistenceCheck: PERSISTENCE_DAYS.has(day)
        ? "PASS · awaiting, ready-turn recovery, and resolved reload"
        : "Covered by phase representatives",
      browserStatus: "PASS",
      defectId: DEFECT_IDS_BY_EPISODE[episodeId] ?? null,
      finalDisposition: DEFECT_IDS_BY_EPISODE[episodeId] ? "HARDENED · REPAIRED" : "HARDENED",
    });
    await writeMachineOutput();
    console.log(`PASS ${episodeId}: exit ${exit}; useful ${useful.outcome?.id}`);
  } catch (error) {
    await recordFailure(page, episodeId, activeResponse, error);
    throw error;
  }
}

const executablePath = await firstAvailable(chromeCandidates);
await assertQaPortAvailable();
await mkdir(evidenceRoot, { recursive: true });
const profileDir = await mkdtemp(join(tmpdir(), "italy-checkpoint-hardening-"));
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
    hasTouch: true,
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
  await startDemo(page);
  for (const episodeId of checkpointIds) await hardenCheckpoint(page, episodeId);

  if (requestedCheckpoint) {
    assert.equal(rows.length, 1);
    assert.deepEqual(consoleFailures, [], `Browser console failures:\n${consoleFailures.join("\n")}`);
    assert.deepEqual(responseFailures, [], `Failed browser responses:\n${responseFailures.join("\n")}`);
    console.log(`Focused checkpoint hardening passed: ${requestedCheckpoint}`);
    await writeMachineOutput();
    process.exitCode = 0;
  } else {

    await page.locator('[data-primary-action="true"]:visible').click();
    await page.getByRole("heading", { name: "The words you need, within reach." }).waitFor();
    await page.getByRole("region", { name: "Demo Pocket Deck evidence boundary" }).waitFor();
    assert.match(
      await page.getByRole("region", { name: "Demo Pocket Deck evidence boundary" }).innerText(),
      /canonically advanced checkpoints add no practice evidence/i,
    );
    await captureBoth(page, "trip-mode");
    await assertOwnerRecordsUnchanged(page, ownerBefore);

    await page.getByRole("button", { name: "Exit demo" }).click();
    await page.locator(".demo-mode-banner").waitFor({ state: "detached" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
    assert.deepEqual(await snapshotLocalStorage(page), ownerBefore, "Owner storage was not restored exactly.");

    assert.equal(rows.length, 31);
    assert.deepEqual(consoleFailures, [], `Browser console failures:\n${consoleFailures.join("\n")}`);
    assert.deepEqual(responseFailures, [], `Failed browser responses:\n${responseFailures.join("\n")}`);
    await writeMachineOutput();

    console.log("Checkpoint hardening passed:");
    console.log("- 31 useful paths and 31 intentional exits completed through the production UI");
    console.log("- canonical entry, six-part review, exactly-once resolution, and continuation passed for every checkpoint");
    console.log("- phase-spanning awaiting, ready-turn recovery, and resolved reload checks passed");
    console.log("- valid Day 30 completion opened Trip Mode; exact owner storage restored after exit and reload");
    console.log("- zero console warnings/errors and zero failed HTTP responses");
    console.log(`- evidence ${evidenceRoot}`);
    console.log(`- isolated origin ${baseUrl}; temporary profile deleted after run`);
  }
} finally {
  await context?.close().catch(() => undefined);
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
}
