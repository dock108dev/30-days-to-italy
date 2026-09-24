import { traversePreparation } from "./preparation-navigation";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { seedEpisodeState, submitEpisodeResponse } from "../app/game/engine";
import { initialState, STORAGE_KEY, type GameState } from "../app/game/model";
import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";

const root = process.cwd();
const port = 3114;
const baseUrl = `http://127.0.0.1:${port}`;
const evidenceRoot = process.env.ITALY_EVIDENCE_ROOT
  ? resolve(process.env.ITALY_EVIDENCE_ROOT, "preparation-browser")
  : resolve(root, "../../italian-pilot-evidence/local/preparation");
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

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

declare global {
  interface Window {
    preparationClips: HTMLAudioElement[];
    releaseOldPlay?: () => void;
  }
}

async function readGame(page: Page): Promise<GameState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
}
function authoritative(game: GameState) {
  const { preparation, ...rest } = game;
  void preparation;
  return rest;
}
async function seed(page: Page, game: GameState) {
  await page.goto(baseUrl);
  await page.evaluate(({ game, profile, gameKey, profileKey }) => {
    localStorage.clear();
    localStorage.setItem(gameKey, JSON.stringify(game));
    localStorage.setItem(profileKey, JSON.stringify(profile));
  }, { game, profile: createDefaultTripProfile(new Date()), gameKey: STORAGE_KEY, profileKey: TRIP_PROFILE_STORAGE_KEY });
  await page.reload();
}
async function assertLayout(page: Page) {
  assert.equal(await page.locator('textarea').count(), 0);
  assert.equal(await page.locator('.audio-stage').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal overflow");
  assert.equal(await page.locator('#preparation-heading').evaluate((node) => document.activeElement === node), true, "heading focus");
  for (const button of await page.locator('.preparation button').all()) {
    assert.ok((await button.boundingBox())!.height >= 44, "touch target");
  }
}

await mkdir(evidenceRoot, { recursive: true });
await assertPortAvailable();
const profileDir = await mkdtemp(join(tmpdir(), "italy-t2-preparation-"));
let server: ChildProcess | null = null;
let context: BrowserContext | null = null;
let serverOutput = "";
const records: Array<Record<string, unknown>> = [];
const networkRecords: unknown[] = [];
try {
  server = spawn("npm", ["start", "--", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", (chunk) => { serverOutput += String(chunk); });
  server.stderr?.on("data", (chunk) => { serverOutput += String(chunk); });
  await waitForServer(server, () => serverOutput);
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath: await firstAvailable(chromeCandidates), headless: true,
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    // Observe real media objects; do not replace playback in the real-audio lane.
    const OriginalAudio = window.Audio;
    window.preparationClips = [];
    window.Audio = function(src?: string) {
      const clip = new OriginalAudio(src);
      window.preparationClips.push(clip);
      return clip;
    } as unknown as typeof Audio;
  });
  const page = context.pages()[0];
  // Ordinary service-worker lane: never bypass interception or clear caches.
  const network = await context.newCDPSession(page);
  await network.send("Network.enable");
  await network.send("Log.enable");
  network.on("Log.entryAdded", ({ entry }) => networkRecords.push({ kind: "browser-log", entry }));
  network.on("Network.responseReceived", ({ type, response }) => {
    if (type === "Document" || response.url.includes("/_next/") || response.url.endsWith("/sw.js")) {
      networkRecords.push({ kind: "response", type, url: response.url, status: response.status,
        fromServiceWorker: response.fromServiceWorker, fromDiskCache: response.fromDiskCache });
    }
  });
  await context.addInitScript(() => {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.info("T4 service-worker controller", navigator.serviceWorker.controller?.scriptURL);
    });
  });
  page.on("console", (message) => {
    if (message.text().startsWith("T4 service-worker")) networkRecords.push({ kind: "control", text: message.text() });
  });
  records.push({ isolation: "Disposable origin/profile; ordinary service-worker interception enabled. No cache clearing or bypass." });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) failures.push(message.text()); });
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Use these trip details" }).waitFor();
  await page.getByLabel("Departure date").fill("2026-09-15");
  assert.equal(await page.locator('textarea').count(), 0);
  await page.getByRole("button", { name: "Use these trip details" }).click();
  await page.getByRole("heading", { name: "Day 0 · A room for the night" }).waitFor();
  await assertLayout(page);
  const first = authoritative(await readGame(page));
  await page.screenshot({ path: join(evidenceRoot, "desktop-day0-situation.png"), fullPage: true });
  await page.getByRole("button", { name: "Prepare for check-in" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Listen for the reservation and the name" }).waitFor();
  await assertLayout(page);
  assert.equal(await page.getByRole("button", { name: "Build a response" }).isDisabled(), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator('textarea').count(), 0);
  await page.screenshot({ path: join(evidenceRoot, "desktop-day0-listen.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("heading", { name: "Listen for the reservation and the name" }).waitFor();
  await assertLayout(page);
  await page.screenshot({ path: join(evidenceRoot, "mobile-day0-listen.png"), fullPage: true });
  for (const speed of ["normal", "careful"] as const) {
    const control = page.getByRole("button", { name: `Play ${speed}`, exact: true });
    await control.click();
    await page.waitForFunction(() => window.preparationClips.at(-1)!.currentTime > .15);
    assert.equal(await control.evaluate((node) => document.activeElement === node), true);
    const media = await page.evaluate(() => { const c = window.preparationClips.at(-1)!; return { src: c.currentSrc, duration: c.duration, currentTime: c.currentTime, paused: c.paused }; });
    records.push({ turn: "e01_01_name", speed, realAudio: media });
    await page.waitForFunction(() => window.preparationClips.at(-1)!.ended);
    await page.getByText("Audio finished.", { exact: true }).waitFor();
  }
  assert.deepEqual(authoritative(await readGame(page)), first);
  await page.getByRole("button", { name: "Play normal", exact: true }).click();
  await page.waitForFunction(() => window.preparationClips.at(-1)!.currentTime > .1);
  const beforeOverview = await readGame(page);
  await page.getByRole("button", { name: "Return to season overview" }).click();
  assert.equal(await page.evaluate(() => window.preparationClips.at(-1)!.paused), true);
  await page.getByRole("button", { name: /A room for the night.*Resume Day 0/ }).click();
  await page.getByRole("heading", { name: "Listen for the reservation and the name" }).waitFor();
  await assertLayout(page);
  assert.deepEqual(await readGame(page), beforeOverview, "same day resumes all state");
  await page.getByRole("button", { name: "Return to season overview" }).click();
  await page.getByRole("button", { name: /The key to Casa Limone.*Start Day 1/ }).click();
  await page.getByRole("heading", { name: "Day 1 · Collect the apartment key" }).waitFor();
  await assertLayout(page);
  await page.screenshot({ path: join(evidenceRoot, "mobile-day1-situation.png"), fullPage: true });
  await page.getByRole("button", { name: "Prepare for the key handoff" }).click();
  await page.getByRole("heading", { name: "Hear the person and the purpose" }).waitFor();
  await page.screenshot({ path: join(evidenceRoot, "mobile-day1-listen.png"), fullPage: true });

  const d0key = submitEpisodeResponse(initialState(), "Fuscoletti").state;
  const d0clarify = submitEpisodeResponse(initialState(), "Ho una prenotazione").state;
  const d0breakfast = submitEpisodeResponse(d0key, "A che ora finisce la colazione?").state;
  const d1 = seedEpisodeState(initialState(), "day-01");
  const d1key = submitEpisodeResponse(d1, "Sono Michael. Sono qui per la chiave.").state;
  for (const game of [d1, d0clarify, d0key, d0breakfast, { ...d0key, turnId: "e01_05_optional" }, d1key]) {
    await seed(page, game);
    await page.locator('#preparation-heading').waitFor();
    if (game.turnId === "d01_01_arrival") await page.getByRole("button", { name: "Prepare for the key handoff" }).click();
    await assertLayout(page);
    const before = authoritative(await readGame(page));
    if (game.teachingFeedback) assert.ok((await page.getByRole("region", { name: "Teaching feedback" }).textContent())!.includes(game.teachingFeedback.understood));
    for (const speed of ["normal", "careful"] as const) {
      await page.getByRole("button", { name: `Play ${speed}`, exact: true }).click();
      await page.waitForFunction(() => window.preparationClips.at(-1)!.currentTime > .15);
      records.push({ turn: game.turnId, speed, realAudio: await page.evaluate(() => { const c = window.preparationClips.at(-1)!; return { src: c.currentSrc, duration: c.duration, currentTime: c.currentTime, paused: c.paused }; }) });
      await page.getByRole("button", { name: "Stop audio" }).click();
      assert.equal(await page.evaluate(() => window.preparationClips.at(-1)!.paused), true);
    }
    assert.deepEqual(authoritative(await readGame(page)), before);
    await page.screenshot({ path: join(evidenceRoot, `mobile-${game.turnId}.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: join(evidenceRoot, `desktop-${game.turnId}.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }

  // Complete preparation flow at every requested viewport, with real UI traversal and text-only responses.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const day of ["day-00", "day-01"] as const) {
      await seed(page, seedEpisodeState(initialState(), day));
      await page.getByRole("button", { name: /^Prepare for / }).click();
      await page.getByRole("button", { name: "Build a response" }).click();
      await page.getByRole("heading", { name: "Written example", exact: true }).waitFor();
      await assertLayout(page);
      assert.deepEqual((await readGame(page)).preparation?.visitedExampleIds, []);
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${day}-pattern.png`), fullPage: true });
      await page.reload();
      await page.getByRole("heading", { name: "Written example", exact: true }).waitFor();
      await page.getByRole("button", { name: /^Continue to / }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
      await page.getByRole("heading", { name: "Now the conversation" }).waitFor();
      assert.equal(await page.locator("textarea").count(), 0, "duplicate Continue cannot skip handoff");
      await assertLayout(page);
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${day}-handoff.png`), fullPage: true });
      await page.reload();
      await page.getByRole("button", { name: "Start conversation" }).click();
      await page.locator("#live-encounter-heading").waitFor();
      assert.equal(await page.locator("#live-encounter-heading").evaluate((node) => document.activeElement === node), true);
      assert.equal(await page.locator("textarea").count(), 0);
      await page.getByRole("button", { name: "Read the line" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
      const composer = page.getByRole("textbox", { name: "Your response" });
      await composer.waitFor();
      assert.equal(await composer.inputValue(), "");
      const read = await readGame(page);
      assert.equal(read.support[day === "day-00" ? "hotel" : "apartment"].transcript, 1);
      assert.equal(read.support[day === "day-00" ? "hotel" : "apartment"].replay, 0);
      await composer.fill("Draft in memory");
      await page.getByRole("button", { name: "Get help" }).click();
      await page.locator(".progressive-help-next").click();
      await page.waitForFunction((key) => { const game = JSON.parse(localStorage.getItem(key)!); return game.progressiveHelp[game.turnId]?.highestLevel === 1; }, STORAGE_KEY);
      await page.keyboard.press("Escape");
      const beforeDetour = authoritative(await readGame(page));
      await page.getByRole("button", { name: "Review preparation", exact: true }).click();
      await page.getByRole("button", { name: /^Prepare for / }).click();
      await page.getByRole("button", { name: "Build a response" }).click();
      await assertLayout(page);
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${day}-detour.png`), fullPage: true });
      await page.getByRole("button", { name: "Return to my response" }).click();
      await composer.waitFor();
      assert.equal(await composer.inputValue(), "Draft in memory");
      assert.equal(await page.locator("#review-preparation").evaluate((node) => document.activeElement === node), true);
      assert.deepEqual(authoritative(await readGame(page)), beforeDetour);
      await page.getByRole("button", { name: "Review preparation", exact: true }).click();
      await page.getByRole("button", { name: /^Prepare for / }).click();
      await page.reload();
      await page.getByRole("button", { name: "Return to my response" }).click();
      await page.locator(".audio-stage[data-interaction-phase=awaiting_line]").waitFor();
      assert.equal(await page.locator("textarea").count(), 0);
      await page.getByRole("button", { name: "Read the line" }).click();
      assert.equal(await composer.inputValue(), "");
      await page.reload();
      await page.locator(".audio-stage[data-interaction-phase=awaiting_line]").waitFor();
      await page.getByRole("button", { name: "Read the line" }).click();
      if (day === "day-01") {
        await composer.fill("Sono Michael");
        await composer.press("Enter");
        await page.getByRole("region", { name: "Teaching feedback" }).waitFor();
        assert.equal(await page.locator(".preparation").count(), 0, "partial retry remains live");
      }
      await composer.fill(day === "day-00" ? "Fuscoletti" : "Sono Michael. Sono qui per la chiave.");
      await page.locator("form.response-box").evaluate((form) => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
      await page.locator(".preparation").waitFor();
      await page.getByRole("heading", { name: "Written example", exact: true }).waitFor();
      await assertLayout(page);
      const keyed = await readGame(page);
      assert.equal(day === "day-00" ? keyed.hotelKey : keyed.apartmentKey, true);
      assert.equal(Object.keys(keyed.episodeResults).length, 0);
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${day}-later-brief.png`), fullPage: true });
      await page.getByRole("button", { name: "Continue conversation", exact: true }).click();
      assert.deepEqual(authoritative(await readGame(page)), authoritative(keyed));
      await page.getByRole("button", { name: "Read the line" }).click();
      await composer.fill("Ho capito");
      await composer.press("Enter");
      await page.locator("#completion-review-title").waitFor();
      await page.getByText("Your response and practice details", { exact: true }).click();
      await page.getByRole("region", { name: "Preparation activity" }).waitFor();
      const resolved = await readGame(page);
      assert.equal(resolved.episodeResults[day]!.length, 1);
      assert.equal(resolved.episodeResults[day]![0].preparation?.traversedSegmentIds.length, 2);
      await page.screenshot({ path: join(evidenceRoot, `${viewport.width}-${day}-result.png`), fullPage: true });
      await page.getByRole("button", { name: "Review preparation", exact: true }).click();
      await page.getByRole("button", { name: /^Prepare for / }).click();
      await page.getByRole("button", { name: "Play careful", exact: true }).click();
      await page.waitForFunction(() => window.preparationClips.at(-1)!.currentTime > .1);
      await page.reload();
      await page.getByRole("button", { name: "Return to review", exact: true }).click();
      await page.locator("#completion-review-title").waitFor();
      assert.equal(await page.locator("#completion-review-title").evaluate((node) => document.activeElement === node), true);
      assert.deepEqual((await readGame(page)).episodeResults, resolved.episodeResults);
      await page.reload();
      await page.locator("#completion-review-title").waitFor();
      assert.deepEqual((await readGame(page)).episodeResults, resolved.episodeResults);
      await page.getByRole("button", { name: "Replay this day" }).click();
      await page.getByRole("button", { name: /^Prepare for / }).waitFor();
      const replayed = await readGame(page);
      assert.deepEqual(replayed.preparation?.traversedSegmentIds, []);
      assert.deepEqual(replayed.preparation?.audioAttempts, {});
      assert.deepEqual(replayed.episodeResults, resolved.episodeResults);
      records.push({ day, viewport, fullFlow: "PASS", textReadiness: "PASS", duplicateNavigationAndSubmission: "PASS", draftHelpFocusDetour: "PASS", reloadBoundaries: "PASS", frozenResultAndReplay: "PASS" });
    }
  }
  await seed(page, initialState());
  await traversePreparation(page);
  await page.evaluate(() => { HTMLMediaElement.prototype.play = () => new Promise<void>((resolve) => { window.releaseOldPlay = resolve; }); });
  await page.getByRole("button", { name: "Play Elena", exact: true }).click();
  await page.getByRole("button", { name: "Review preparation", exact: true }).click();
  await page.evaluate(() => window.releaseOldPlay?.());
  await page.getByRole("button", { name: "Return to my response" }).click();
  await page.locator(".audio-stage[data-interaction-phase=awaiting_line]").waitFor();
  assert.equal(await page.locator("textarea").count(), 0, "old live play cannot restore readiness after review navigation");
  await page.getByRole("button", { name: "Read the line" }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("Fallback focus draft");
  await page.getByRole("button", { name: "Review preparation", exact: true }).click();
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const trigger = document.getElementById("review-preparation");
      if (trigger) { trigger.removeAttribute("id"); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Return to my response" }).click();
  await page.getByRole("textbox", { name: "Your response" }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Your response" }).evaluate((node) => document.activeElement === node), true, "missing invoking-control identity falls back to composer");
  assert.equal(await page.getByRole("textbox", { name: "Your response" }).inputValue(), "Fallback focus draft");
  records.push({ liveStalePromise: "PASS", missingReturnControlFocusFallback: "PASS" });
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, d1key);
  await page.locator("#preparation-heading").waitFor();

  // Separate fault lane: failed starts and stale promises, never claimed as real audio proof.
  await page.evaluate(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new Error("T3 injected failure")); });
  const beforeFailure = authoritative(await readGame(page));
  await page.getByRole("button", { name: "Play normal", exact: true }).click();
  await page.getByText("Audio could not play. You can read the Italian and continue.", { exact: true }).waitFor();
  assert.ok(await page.locator('.preparation-transcript[lang="it"]').first().isVisible());
  assert.deepEqual(authoritative(await readGame(page)), beforeFailure);
  await page.screenshot({ path: join(evidenceRoot, "mobile-audio-failure.png"), fullPage: true });
  await page.evaluate(() => { HTMLMediaElement.prototype.play = () => new Promise<void>((resolve) => { window.releaseOldPlay = resolve; }); });
  await page.getByRole("button", { name: "Play careful", exact: true }).click();
  await page.getByRole("button", { name: "Return to season overview" }).click();
  await page.getByRole("button", { name: /The key to Casa Limone.*Resume Day 1/ }).click();
  await page.locator('#preparation-heading').waitFor();
  const newState = await readGame(page);
  await page.evaluate(() => window.releaseOldPlay?.());
  await assertLayout(page);
  assert.deepEqual(await readGame(page), newState);
  assert.equal(await page.getByRole("button", { name: "Stop audio" }).isDisabled(), true);
  records.push({ faults: "failed start readable; stale play after overview cannot change new page or focus", statePreserved: true });
  await page.getByRole("button", { name: "Play careful", exact: true }).click();
  const ownerRaw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.getByRole("button", { name: "Start demo walkthrough", exact: true }).click();
  await page.getByRole("button", { name: "Exit demo", exact: true }).waitFor();
  await page.getByRole("button", { name: "Prepare for check-in", exact: true }).click();
  await page.getByRole("heading", { name: "Listen for the reservation and the name" }).waitFor();
  await page.evaluate(() => window.releaseOldPlay?.());
  await assertLayout(page);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), ownerRaw, "old preparation callback cannot save into demo/owner session");
  assert.equal(await page.getByRole("button", { name: "Stop audio" }).isDisabled(), true);
  await page.getByRole("button", { name: "Exit demo", exact: true }).click();
  await page.getByRole("heading", { name: "Find the door, then the floor", level: 2 }).waitFor();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), ownerRaw, "exact owner game restoration");
  records.push({ isolation: "Synthetic owner preparation restored byte-for-byte after real Admin session switch; old play callback ignored" });


  await seed(page, seedEpisodeState(initialState(), "day-02"));
  await page.locator('.audio-stage').waitFor();
  assert.equal(await page.locator('.preparation').count(), 0);
  await page.getByRole("button", { name: /^Play / }).click();
  await page.getByRole("textbox", { name: "Your response" }).waitFor();
  records.push({ laterDay: "Day 2 retains live playback and composer" });
  records.push({ serviceWorker: await page.evaluate(async () => ({
    controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    registrations: (await navigator.serviceWorker.getRegistrations()).map((item) => ({
      scope: item.scope, active: item.active?.state, waiting: item.waiting?.state,
    })),
    caches: await Promise.all((await caches.keys()).map(async (name) => ({ name, count: (await (await caches.open(name)).keys()).length }))),
  })) });
  assert.deepEqual(failures, []);
  await writeFile(join(evidenceRoot, "results.json"), JSON.stringify({ status: "PASS", origin: baseUrl, profileDir, records, failures }, null, 2));
  console.log(`Preparation browser PASS. ${records.length} records; evidence ${evidenceRoot}`);
} catch (error) {
  await writeFile(join(evidenceRoot, "failure.json"), JSON.stringify({ error: String(error), records, serverOutput }, null, 2));
  await context?.pages()[0]?.screenshot({ path: join(evidenceRoot, "failed-screen.png"), fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  await context?.close();
  await stopServer(server);
  await rm(profileDir, { recursive: true, force: true });
  await writeFile(join(evidenceRoot, "network.json"), JSON.stringify(networkRecords, null, 2));
  await writeFile(join(evidenceRoot, "server.log"), serverOutput);
  await writeFile(join(evidenceRoot, "cleanup.txt"), `Closed disposable context; removed ${profileDir}; stopped attempt server on ${baseUrl}. Owner origin/profile untouched.\n`);
}
