import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { seedEpisodeState } from "../app/game/engine";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3112;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = process.env.ITALY_EVIDENCE_ROOT
  ? resolve(process.env.ITALY_EVIDENCE_ROOT, "browser")
  : resolve(root, "../../italian-pilot-evidence/local/progressive-help");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

const activeTurns = [
  ["day-00", "e01_01_name"],
  ["day-00", "e01_02_clarify_name"],
  ["day-00", "e01_03_key"],
  ["day-00", "e01_04_breakfast"],
  ["day-00", "e01_05_optional"],
  ["day-01", "d01_01_arrival"],
  ["day-01", "d01_02_door"],
] as const;
const viewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "portrait-390x844", width: 390, height: 844 },
  { name: "landscape-844x390", width: 844, height: 390 },
] as const;

async function firstAvailable(paths: readonly string[]) {
  for (const path of paths) {
    try { await access(path); return path; } catch { /* try the next local browser */ }
  }
  throw new Error("No Chromium browser is available.");
}

async function assertPortAvailable() {
  await new Promise<void>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close((error) => error ? reject(error) : resolvePort()));
  });
}

async function waitForServer(child: ChildProcess, output: () => string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`QA server exited early.\n${output()}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch { /* server is starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`QA server did not become ready.\n${output()}`);
}

async function stopServer(child: ChildProcess | null) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function authoritativeSnapshot(state: GameState) {
  return {
    episodeId: state.episodeId, turnId: state.turnId, status: state.status,
    money: state.money, hotelKey: state.hotelKey, apartmentKey: state.apartmentKey,
    keyCustody: state.keyCustody, completed: state.completed, outcome: state.outcome,
    pendingOutcome: state.pendingOutcome, relationships: state.relationships,
    knownFacts: state.knownFacts, verifiedFacts: state.verifiedFacts,
    observedMoves: state.observedMoves, episodeResults: state.episodeResults,
  };
}

async function seedTurn(page: Page, episodeId: "day-00" | "day-01", turnId: string) {
  let game = seedEpisodeState(initialState(), episodeId);
  game = { ...game, turnId };
  const profile = createDefaultTripProfile(new Date());
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ gameKey, gameValue, profileKey, profileValue }) => {
    if ("serviceWorker" in navigator) {
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    }
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem(gameKey, gameValue);
    localStorage.setItem(profileKey, profileValue);
  }, {
    gameKey: STORAGE_KEY, gameValue: JSON.stringify(game),
    profileKey: TRIP_PROFILE_STORAGE_KEY, profileValue: JSON.stringify(profile),
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  return game;
}

async function storedGame(page: Page): Promise<GameState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as GameState, STORAGE_KEY);
}

async function waitForLevel(page: Page, turnId: string, level: number) {
  await page.waitForFunction(({ key, id, expected }) => {
    const value = JSON.parse(localStorage.getItem(key)!) as GameState;
    return value.progressiveHelp[id]?.highestLevel === expected;
  }, { key: STORAGE_KEY, id: turnId, expected: level });
}

async function exerciseTurn(page: Page, episodeId: "day-00" | "day-01", turnId: string, screenshot?: string) {
  await seedTurn(page, episodeId, turnId);
  await page.getByRole("button", { name: /^Play / }).click();
  const composerHelp = page.getByRole("button", { name: "Open progressive help" });
  await composerHelp.waitFor();
  assert.equal(await page.locator(".phrase-toolkit").count(), 0, `${turnId} must remove phrase-card scavenging`);
  assert.equal(await page.locator("[data-help-level]").count(), 0, `${turnId} must begin unrevealed`);
  await composerHelp.click();
  const next = page.locator(".progressive-help-next");
  await next.waitFor();
  assert.equal(await next.evaluate((button) => document.activeElement === button), true, `${turnId} opening focus`);
  const nextBounds = await next.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight, width: window.innerWidth, position: getComputedStyle(button.parentElement!).position };
  });
  assert.equal(nextBounds.top >= 0 && nextBounds.bottom <= nextBounds.viewport, true, `${turnId} next help action must remain in the viewport: ${JSON.stringify(nextBounds)}`);
  assert.match(await next.innerText(), /Level 1: Replay normal audio/);
  const before = authoritativeSnapshot(await storedGame(page));

  await next.click();
  await waitForLevel(page, turnId, 1);
  assert.equal(await page.locator('[data-help-level="1"]').count(), 1);
  assert.equal(await page.locator('[data-help-level="3"], [data-help-level="4"], [data-help-level="5"], [data-help-level="6"]').count(), 0);
  await next.click();
  await waitForLevel(page, turnId, 2);
  assert.equal(await page.locator('[data-help-level="4"], [data-help-level="5"], [data-help-level="6"]').count(), 0);
  await next.click();
  await waitForLevel(page, turnId, 3);
  assert.equal(await page.locator('[data-help-level="3"] p[lang="it"]').count(), 1);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("button", { name: "Open progressive help" }).click();
  await page.locator('[data-help-level="3"]').waitFor();
  assert.equal((await storedGame(page)).progressiveHelp[turnId]?.highestLevel, 3, `${turnId} reload boundary`);

  for (const level of [4, 5, 6]) {
    await page.locator(".progressive-help-next").click();
    await waitForLevel(page, turnId, level);
  }
  assert.match(await page.locator('[data-help-level="5"] p').textContent() ?? "", /___/);
  assert.doesNotMatch(await page.locator('[data-help-level="6"] p').textContent() ?? "", /___/);
  assert.deepEqual(authoritativeSnapshot(await storedGame(page)), before, `${turnId} authoritative state`);
  if (screenshot) await page.screenshot({ path: join(evidenceRoot, `${screenshot}.png`), fullPage: true });

  const close = page.getByRole("button", { name: "Close help" });
  await close.click();
  assert.equal(await composerHelp.evaluate((button) => document.activeElement === button), true, `${turnId} close focus restoration`);
}

await mkdir(evidenceRoot, { recursive: true });
await assertPortAvailable();
const executablePath = await firstAvailable(chromeCandidates);
const profileDir = await mkdtemp(join(tmpdir(), "italy-progressive-help-"));
let server: ChildProcess | null = null;
let context: BrowserContext | null = null;
let serverOutput = "";

try {
  server = spawn("npm", ["start", "--", "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", (chunk) => { serverOutput += String(chunk); });
  server.stderr?.on("data", (chunk) => { serverOutput += String(chunk); });
  await waitForServer(server, () => serverOutput);
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath, headless: true, viewport: { width: 1440, height: 900 },
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  await context.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, "serviceWorker");
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value() {
      if (sessionStorage.getItem("progressive-help-fail-audio-once") === "true") {
        sessionStorage.removeItem("progressive-help-fail-audio-once");
        return Promise.reject(new DOMException("Simulated audio rejection", "NotSupportedError"));
      }
      this.dispatchEvent(new Event("play")); return Promise.resolve();
    } });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value() { this.dispatchEvent(new Event("pause")); } });
  });
  const page = context.pages()[0] ?? await context.newPage();
  const consoleFailures: string[] = [];
  const httpFailures: string[] = [];
  const externalRequests: string[] = [];
  page.on("console", (message) => { if (["warning", "error"].includes(message.type())) consoleFailures.push(`${message.type()}: ${message.text()}`); });
  page.on("pageerror", (error) => consoleFailures.push(`pageerror: ${error.message}`));
  page.on("response", (response) => { if (response.status() >= 400) httpFailures.push(`${response.status()} ${response.url()}`); });
  page.on("request", (request) => { if (!request.url().startsWith(baseUrl) && !request.url().startsWith("data:")) externalRequests.push(request.url()); });

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const [episodeId, turnId] of activeTurns) {
      await exerciseTurn(page, episodeId, turnId, turnId === "d01_02_door" ? viewport.name : undefined);
    }
  }

  await seedTurn(page, "day-00", "e01_01_name");
  await page.getByRole("button", { name: /^Play / }).click();
  const keyboardHelp = page.getByRole("button", { name: "Open progressive help" });
  await keyboardHelp.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".progressive-help-next").evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press("Escape");
  assert.equal(await keyboardHelp.evaluate((button) => document.activeElement === button), true);

  await seedTurn(page, "day-00", "e01_01_name");
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("button", { name: "Open progressive help" }).click();
  await page.evaluate(() => sessionStorage.setItem("progressive-help-fail-audio-once", "true"));
  await page.locator(".progressive-help-next").click();
  await waitForLevel(page, "e01_01_name", 1);
  assert.equal(await page.locator(".audio-fallback").count(), 1, "audio failure must expose the transcript fallback");
  assert.equal(await page.locator('[data-help-level="4"], [data-help-level="5"], [data-help-level="6"]').count(), 0, "audio failure must not skip help levels");

  await seedTurn(page, "day-00", "e01_01_name");
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("button", { name: "Open progressive help" }).click();
  await page.locator(".progressive-help-next").click();
  await waitForLevel(page, "e01_01_name", 1);
  await page.getByRole("button", { name: "Close help" }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("Fuscoletti. Ho una prenotazione.");
  await page.getByRole("button", { name: "Respond" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  let transition = await storedGame(page);
  assert.equal(transition.turnId, "e01_03_key");
  assert.equal(transition.progressiveHelp.e01_01_name?.highestLevel, 1);
  assert.equal(transition.progressiveHelp.e01_03_key, undefined, "new turn must start unrevealed");
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("Camera dodici, primo piano.");
  await page.getByRole("button", { name: "Respond" }).click();
  await page.locator(".outcome-card").waitFor();
  assert.match(await page.locator('[data-review-section="help-history"]').textContent() ?? "", /e01_01_name: level 1/);
  await page.getByRole("button", { name: "Replay this day" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  transition = await storedGame(page);
  assert.deepEqual(transition.progressiveHelp, {}, "replay must reset revealed help");

  const expectedAudioFailures = consoleFailures.filter((entry) => entry.includes("AUDIO_PLAYBACK_FAILED"));
  const unexpectedConsoleFailures = consoleFailures.filter((entry) => !expectedAudioFailures.includes(entry));
  assert.equal(expectedAudioFailures.length, 1, "the injected audio failure must be reported once");
  assert.deepEqual(unexpectedConsoleFailures, [], `Unexpected console/page failures:\n${unexpectedConsoleFailures.join("\n")}`);
  assert.deepEqual(httpFailures, [], `HTTP failures:\n${httpFailures.join("\n")}`);
  assert.deepEqual([...new Set(externalRequests)], [], `External requests:\n${externalRequests.join("\n")}`);
  console.log(`Progressive help browser acceptance passed: ${activeTurns.length} turns × ${viewports.length} viewports; keyboard/focus/reload/state checks; evidence ${evidenceRoot}`);
} finally {
  await context?.close().catch(() => undefined);
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
}
