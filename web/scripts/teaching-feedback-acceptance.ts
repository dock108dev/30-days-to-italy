import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { seedEpisodeState } from "../app/game/engine";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3113;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = process.env.ITALY_EVIDENCE_ROOT
  ? resolve(process.env.ITALY_EVIDENCE_ROOT, "browser")
  : resolve(root, "../../italian-pilot-evidence/local/teaching-feedback");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

const successCases = [
  ["day-00", "e01_01_name", "Fuscoletti. Ho una prenotazione.", "identified the check-in booking"],
  ["day-00", "e01_02_clarify_name", "Il cognome è Fuscoletti.", "repeated the booking surname"],
  ["day-00", "e01_03_key", "Camera dodici.", "confirmed room 12"],
  ["day-00", "e01_04_breakfast", "La colazione finisce alle dieci.", "breakfast ends at 10"],
  ["day-00", "e01_05_optional", "Sì, è la mia prima volta.", "first time in Salerno"],
  ["day-01", "d01_01_arrival", "Sì, sono Michael. Sono qui per la chiave.", "asked for the key"],
  ["day-01", "d01_02_door", "La porta verde, poi il primo piano.", "green door and the first floor"],
] as const;
const viewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "portrait-390x844", width: 390, height: 844 },
  { name: "landscape-844x390", width: 844, height: 390 },
] as const;

async function firstAvailable(paths: readonly string[]) {
  for (const path of paths) {
    try { await access(path); return path; } catch { /* try next */ }
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
    try { if ((await fetch(baseUrl)).ok) return; } catch { /* starting */ }
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

function seededTurn(episodeId: "day-00" | "day-01", turnId: string): GameState {
  const state = seedEpisodeState(initialState(), episodeId);
  return {
    ...state,
    turnId,
    ...(turnId === "e01_03_key" || turnId === "e01_04_breakfast" || turnId === "e01_05_optional"
      ? { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" as const } }
      : {}),
    ...(turnId === "d01_02_door"
      ? { apartmentKey: true, keyCustody: { ...state.keyCustody, apartment: "held" as const } }
      : {}),
  };
}

async function seedTurn(page: Page, episodeId: "day-00" | "day-01", turnId: string) {
  const game = seededTurn(episodeId, turnId);
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

async function startResponse(page: Page) {
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("textbox", { name: "Your response" }).waitFor();
}

async function submit(page: Page, response: string) {
  await page.getByRole("textbox", { name: "Your response" }).fill(response);
  await page.getByRole("button", { name: "Respond" }).click();
  await page.getByRole("region", { name: "Teaching feedback" }).waitFor();
}

async function assertFeedback(page: Page, understood: RegExp) {
  const result = page.getByRole("region", { name: "Teaching feedback" });
  assert.equal(await result.count(), 1, "one compact teaching component");
  assert.match(await result.textContent() ?? "", /We understood/);
  assert.match(await result.textContent() ?? "", /More natural/);
  assert.match(await result.textContent() ?? "", understood);
  assert.equal(await result.locator("dt", { hasText: "More natural" }).count(), 1);
}

await mkdir(evidenceRoot, { recursive: true });
await assertPortAvailable();
const executablePath = await firstAvailable(chromeCandidates);
const profileDir = await mkdtemp(join(tmpdir(), "italy-teaching-feedback-"));
let server: ChildProcess | null = null;
let context: BrowserContext | null = null;
let serverOutput = "";
const records: Array<Record<string, unknown>> = [];

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
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value() { this.dispatchEvent(new Event("play")); return Promise.resolve(); } });
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
    for (const [episodeId, turnId, response, understood] of successCases) {
      await seedTurn(page, episodeId, turnId);
      await startResponse(page);
      await submit(page, response);
      await assertFeedback(page, new RegExp(understood, "i"));
      const state = await storedGame(page);
      if (state.status !== "active") {
        assert.equal(await page.locator(".outcome-card").count(), 1, `${turnId} completion review`);
        assert.deepEqual(state.episodeResults[episodeId]?.[0]?.teachingFeedback, state.teachingFeedback);
      }
      records.push({ viewport: viewport.name, episodeId, turnId, status: state.status, outcomeId: state.outcome?.id ?? null, feedback: state.teachingFeedback });
    }
    await page.screenshot({ path: join(evidenceRoot, `${viewport.name}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await seedTurn(page, "day-01", "d01_01_arrival");
  await startResponse(page);
  await submit(page, "Sì, sono Michael.");
  await assertFeedback(page, /key request is still missing/i);
  const partial = (await storedGame(page)).teachingFeedback;
  await submit(page, "Michael key");
  await assertFeedback(page, /nothing actionable/i);
  assert.notDeepEqual((await storedGame(page)).teachingFeedback, partial, "subsequent feedback replaces prior feedback");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("region", { name: "Teaching feedback" }).waitFor();
  await assertFeedback(page, /nothing actionable/i);

  await seedTurn(page, "day-01", "d01_02_door");
  await startResponse(page);
  await submit(page, "La porta verde.");
  await assertFeedback(page, /first floor is still missing/i);
  assert.equal((await storedGame(page)).turnId, "d01_02_door");

  await seedTurn(page, "day-00", "e01_03_key");
  await startResponse(page);
  await submit(page, "grazie");
  await assertFeedback(page, /nothing actionable/i);
  assert.equal((await storedGame(page)).turnId, "e01_03_key");

  await seedTurn(page, "day-01", "d01_02_door");
  await startResponse(page);
  await submit(page, "Devo andare.");
  await assertFeedback(page, /directions remain unconfirmed/i);
  let state = await storedGame(page);
  assert.equal(state.outcome?.id, "D01-O3");
  assert.equal(state.keyCustody.apartment, "held");
  const recordedExitFeedback = state.episodeResults["day-01"]?.[0]?.teachingFeedback;
  await page.getByRole("button", { name: "Replay this day" }).click();
  await page.locator('.audio-stage[data-interaction-phase="awaiting_line"]').waitFor();
  state = await storedGame(page);
  assert.equal(state.teachingFeedback, null, "replay clears immediate feedback");
  assert.deepEqual(state.episodeResults["day-01"]?.[0]?.teachingFeedback, recordedExitFeedback, "replay retains completion evidence");

  await seedTurn(page, "day-01", "d01_02_door");
  const play = page.getByRole("button", { name: /^Play / });
  await play.focus();
  await page.keyboard.press("Enter");
  const textbox = page.getByRole("textbox", { name: "Your response" });
  assert.equal(await textbox.evaluate((element) => document.activeElement === element), true, "keyboard response focus");
  await textbox.fill("Il primo piano.");
  await page.keyboard.press("Tab");
  assert.equal(await page.getByRole("button", { name: "Respond" }).evaluate((element) => document.activeElement === element), true, "keyboard submit focus");
  await page.keyboard.press("Enter");
  await assertFeedback(page, /green door is still missing/i);
  assert.equal(await textbox.evaluate((element) => document.activeElement === element), true, "same-turn retry restores response focus");

  assert.deepEqual(consoleFailures, [], `Unexpected console/page failures:\n${consoleFailures.join("\n")}`);
  assert.deepEqual(httpFailures, [], `HTTP failures:\n${httpFailures.join("\n")}`);
  assert.deepEqual([...new Set(externalRequests)], [], `External requests:\n${externalRequests.join("\n")}`);
  await writeFile(join(evidenceRoot, "browser-results.json"), `${JSON.stringify({ records, representative: { partial: true, failed: true, exit: true, reload: true, replay: true, keyboard: true }, failures: { console: [], http: [], external: [] } }, null, 2)}\n`);
  console.log(`Teaching feedback browser acceptance passed: ${successCases.length} turns × ${viewports.length} viewports; success/partial/failed/exit/reload/replay/keyboard checks; evidence ${evidenceRoot}`);
} finally {
  await context?.close().catch(() => undefined);
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
}
