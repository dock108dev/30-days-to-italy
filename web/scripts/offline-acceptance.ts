import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { createDefaultTripProfile } from "../app/trip/model";
import { TRIP_PROFILE_STORAGE_KEY } from "../app/trip/persistence";
import { LIFECYCLE_STORAGE_KEY } from "../app/lifecycle/persistence";
import {
  CORE_POCKET_DECK_CARD_IDS,
} from "../app/pocket-deck/catalog";
import {
  applyPocketDeckPracticeEvidence,
  createDefaultPocketDeckState,
  togglePocketDeckPin,
  type PocketDeckPracticeEvidence,
} from "../app/pocket-deck/model";
import { POCKET_DECK_STORAGE_KEY } from "../app/pocket-deck/persistence";
import { OFFLINE_CACHE_PREFIX } from "../build/offline-assets";
import { REQUIRED_AUDIO_COUNT, REQUIRED_POCKET_DECK_AUDIO_COUNT } from "../build/offline-catalog";

const root = process.cwd();
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

async function firstAvailable(paths: readonly string[]): Promise<string> {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next known local browser.
    }
  }
  throw new Error(
    "No Chromium browser is available. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.",
  );
}

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not resolve a local acceptance-test port."));
        return;
      }
      const { port } = address;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function waitForServer(url: string, child: ChildProcess, output: () => string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server exited early.\n${output()}`);
    }
    try {
      const response = await fetch(url, { headers: { accept: "text/html" } });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Production server did not become ready.\n${output()}`);
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

function practiceEvidence(): PocketDeckPracticeEvidence {
  return {
    id: "guided-beach:attempt-3",
    cardId: "beach-one-chair-umbrella",
    source: "guided-beach",
    episodeId: "day-04",
    attempt: 3,
    outcomeId: "E2-O1",
    practicedMoves: ["request", "quantity", "confirm"],
    refresherApplied: true,
    refresherMethod: "inserted",
    quantityClarified: true,
    priceConfirmed: true,
    preferenceSelected: null,
    normalReplayCount: 0,
    carefulReplayCount: 0,
    transcriptRevealCount: 0,
  };
}

function seededStorage() {
  const profile = createDefaultTripProfile(new Date(2026, 7, 3, 12));
  let deck = applyPocketDeckPracticeEvidence(
    createDefaultPocketDeckState(),
    practiceEvidence(),
    CORE_POCKET_DECK_CARD_IDS,
  );
  deck = togglePocketDeckPin(deck, "beach-one-chair-umbrella", CORE_POCKET_DECK_CARD_IDS);
  return {
    [TRIP_PROFILE_STORAGE_KEY]: JSON.stringify(profile),
    [LIFECYCLE_STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, mode: "trip" }),
    [POCKET_DECK_STORAGE_KEY]: JSON.stringify(deck),
  };
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.equal(geometry.documentWidth <= geometry.innerWidth, true, `${label}: document overflow`);
  assert.equal(geometry.bodyWidth <= geometry.innerWidth, true, `${label}: body overflow`);
}

async function waitForOfflineLabel(page: Page, label: "Ready offline" | "Offline") {
  await page.getByText(label, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
}

async function closeContext(context: BrowserContext | null) {
  if (context) await context.close().catch(() => undefined);
}

const executablePath = await firstAvailable(chromeCandidates);
const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
let serverOutput = "";
let server: ChildProcess | null = null;
let browser = null as Awaited<ReturnType<typeof chromium.launch>> | null;
let freshContext: BrowserContext | null = null;
let context: BrowserContext | null = null;

try {
  server = spawn(
    process.execPath,
    [resolve(root, "node_modules/vinext/dist/cli.js"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(baseUrl, server, () => serverOutput);

  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  freshContext = await browser.newContext({ serviceWorkers: "allow" });
  await freshContext.setOffline(true);
  const freshPage = await freshContext.newPage();
  let firstOfflineVisitLoaded = false;
  try {
    await freshPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 5_000 });
    firstOfflineVisitLoaded = true;
  } catch {
    // A first-ever disconnected visit is intentionally unsupported.
  }
  assert.equal(firstOfflineVisitLoaded, false);
  await closeContext(freshContext);
  freshContext = null;

  context = await browser.newContext({
    serviceWorkers: "allow",
    viewport: { width: 1440, height: 900 },
  });
  const logs: string[] = [];
  const failedResponses: string[] = [];
  let deliberatelyOffline = false;
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      if (
        deliberatelyOffline &&
        /ERR_INTERNET_DISCONNECTED|Failed to load resource/i.test(message.text())
      ) return;
      const location = message.location();
      logs.push(`${message.type()}: ${message.text()}${location.url ? ` @ ${location.url}` : ""}`);
    }
  });
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`${baseUrl}/favicon.svg`, { waitUntil: "networkidle" });
  await page.evaluate(async (prefix) => {
    const obsolete = await caches.open(`${prefix}obsolete-test`);
    await obsolete.put("/old", new Response("old"));
  }, OFFLINE_CACHE_PREFIX);

  const storageEntries = Object.entries(seededStorage());
  await page.addInitScript((entries) => {
    if (localStorage.getItem("offline-acceptance-seeded-v1")) return;
    for (const [key, value] of entries) localStorage.setItem(key, value);
    localStorage.setItem("offline-acceptance-seeded-v1", "true");
  }, storageEntries);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  try {
    await waitForOfflineLabel(page, "Ready offline");
  } catch (error) {
    const diagnostics = await page.evaluate(async () => ({
      bodyText: document.body.innerText.slice(0, 2_000),
      online: navigator.onLine,
      controller: navigator.serviceWorker.controller?.state ?? null,
      registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
        scope: registration.scope,
        active: registration.active?.state ?? null,
        waiting: registration.waiting?.state ?? null,
        installing: registration.installing?.state ?? null,
      })),
      caches: await caches.keys(),
    }));
    throw new Error(`${String(error)}\n${JSON.stringify(diagnostics, null, 2)}\n${logs.join("\n")}`);
  }
  await page.getByText("1 saved", { exact: true }).waitFor();
  await page.getByRole("button", {
    name: "Unpin I need one beach chair and one umbrella.",
    exact: true,
  }).waitFor();

  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute("href");
  assert.equal(manifestLink, "/manifest.webmanifest");
  const webManifest = await (await page.request.get(`${baseUrl}/manifest.webmanifest`)).json();
  assert.equal(webManifest.name, "30 Days to Italy");
  assert.equal(webManifest.display, "standalone");

  const offlineManifest = await (await page.request.get(`${baseUrl}/offline-manifest.json`)).json() as {
    cacheVersion: string;
    audioCount: number;
    pocketDeckAudioCount: number;
    urls: string[];
  };
  assert.equal(offlineManifest.audioCount, REQUIRED_AUDIO_COUNT);
  assert.equal(offlineManifest.pocketDeckAudioCount, REQUIRED_POCKET_DECK_AUDIO_COUNT);
  const activeCacheNames = await page.evaluate(() => caches.keys());
  assert.equal(activeCacheNames.includes(`${OFFLINE_CACHE_PREFIX}obsolete-test`), false);
  assert.equal(activeCacheNames.includes(`${OFFLINE_CACHE_PREFIX}${offlineManifest.cacheVersion}`), true);

  const repairTarget = offlineManifest.urls.find((url) =>
    url.startsWith("/audio/pocket-deck/normal/"),
  );
  assert.ok(repairTarget);
  await page.evaluate(async ({ cacheName, target }) => {
    const cache = await caches.open(cacheName);
    const removed = await cache.delete(target);
    if (!removed) throw new Error(`Could not remove ${target} for repair test.`);
  }, {
    cacheName: `${OFFLINE_CACHE_PREFIX}${offlineManifest.cacheVersion}`,
    target: repairTarget,
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitForOfflineLabel(page, "Ready offline");
  assert.equal(await page.evaluate(async ({ cacheName, target }) => {
    const cache = await caches.open(cacheName);
    return Boolean(await cache.match(target));
  }, {
    cacheName: `${OFFLINE_CACHE_PREFIX}${offlineManifest.cacheVersion}`,
    target: repairTarget,
  }), true);

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page, "390px portrait");
  await page.setViewportSize({ width: 844, height: 390 });
  await assertNoHorizontalOverflow(page, "844x390 landscape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertNoHorizontalOverflow(page, "desktop");

  deliberatelyOffline = true;
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  try {
    await waitForOfflineLabel(page, "Offline");
  } catch (error) {
    const diagnostics = await page.evaluate(async () => ({
      badge: document.querySelector("[data-offline-status]")?.textContent?.trim() ?? null,
      badgeState: document.querySelector("[data-offline-status]")?.getAttribute("data-offline-status") ?? null,
      online: navigator.onLine,
      controller: navigator.serviceWorker.controller?.state ?? null,
      registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
        active: registration.active?.state ?? null,
        waiting: registration.waiting?.state ?? null,
      })),
      caches: await caches.keys(),
    }));
    throw new Error(`${String(error)}\n${JSON.stringify(diagnostics, null, 2)}\n${logs.join("\n")}`);
  }

  const offlineAudioResults = await page.evaluate(async (urls) => Promise.all(
    urls.filter((url) => url.startsWith("/audio/")).map(async (url) => {
      const response = await fetch(url);
      return { url, status: response.status, size: (await response.arrayBuffer()).byteLength };
    }),
  ), offlineManifest.urls);
  assert.equal(offlineAudioResults.length, REQUIRED_AUDIO_COUNT);
  assert.equal(offlineAudioResults.every((result) => result.status === 200 && result.size > 1_000), true);

  const openBeach = page.getByRole("button", {
    name: "Open I need one beach chair and one umbrella.",
    exact: true,
  }).first();
  await openBeach.click();
  await page.getByRole("heading", { name: "You have handled this before.", exact: true }).waitFor();
  await page.evaluate(() => {
    const audio = document.querySelector<HTMLAudioElement>(".pocket-deck-shell audio");
    const trackedWindow = window as unknown as { __offlineAudioEvents: string[] };
    trackedWindow.__offlineAudioEvents = [];
    audio?.addEventListener("play", () => trackedWindow.__offlineAudioEvents.push(audio.currentSrc));
  });
  await page.getByRole("button", {
    name: "Play normal Italian audio for I need one beach chair and one umbrella.",
    exact: true,
  }).click();
  await page.getByText("Playing normal Italian audio.", { exact: true }).waitFor();
  await page.waitForFunction(() => {
    const audio = document.querySelector<HTMLAudioElement>(".pocket-deck-shell audio");
    return Boolean(audio?.paused);
  }, undefined, { timeout: 15_000 });
  await page.getByRole("button", {
    name: "Play careful Italian audio for I need one beach chair and one umbrella.",
    exact: true,
  }).click();
  await page.getByText("Playing careful Italian audio.", { exact: true }).waitFor();
  await page.waitForTimeout(250);
  const playedAudio = await page.evaluate(() =>
    (window as unknown as { __offlineAudioEvents: string[] }).__offlineAudioEvents,
  );
  assert.equal(playedAudio.some((url) => url.endsWith("/normal/beach-one-chair-umbrella.m4a")), true);
  assert.equal(playedAudio.some((url) => url.endsWith("/careful/beach-one-chair-umbrella.m4a")), true);
  assert.equal(await page.getByText(/Audio could not play/).count(), 0);

  const showButton = page.getByRole("button", { name: "Show this", exact: true });
  await showButton.click();
  const dialog = page.getByRole("dialog", { name: "Frase da mostrare" });
  await dialog.waitFor();
  const dialogText = await dialog.innerText();
  assert.equal(dialogText.includes("From your rehearsal"), false);
  assert.equal(dialogText.includes("€22"), false);
  await page.getByRole("button", { name: "Close large-text view", exact: true }).click();
  await page.waitForFunction(() =>
    document.activeElement instanceof HTMLButtonElement &&
    document.activeElement.textContent?.includes("Show this") === true,
  );
  assert.equal(await showButton.evaluate((element) => element === document.activeElement), true);

  const unpin = page.getByRole("button", {
    name: "Unpin I need one beach chair and one umbrella.",
    exact: true,
  });
  await unpin.click();
  await page.getByRole("button", {
    name: "Pin I need one beach chair and one umbrella.",
    exact: true,
  }).click();
  await page.getByRole("button", { name: "Back to deck", exact: true }).click();
  await page.getByRole("heading", { name: "Ready when you need it", exact: true }).waitFor();

  const search = page.getByRole("searchbox", { name: "Search in English", exact: true });
  await search.fill("pay by card");
  await page.getByRole("button", { name: "Open Can I pay by card?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear Pocket Deck filters", exact: true }).click();
  await page.getByRole("button", { name: "Beach 2 cards", exact: true }).click();
  await page.getByText("2 cards ready", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear Pocket Deck filters", exact: true }).click();

  await page.getByRole("button", { name: "Prepare", exact: true }).click();
  await page.getByRole("heading", { name: "A room for the night", exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Trip", exact: true }).click();
  await page.getByRole("heading", { name: "The words you need, within reach.", exact: true }).waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForOfflineLabel(page, "Offline");
  await page.getByText("1 saved", { exact: true }).waitFor();
  await page.getByRole("button", {
    name: "Unpin I need one beach chair and one umbrella.",
    exact: true,
  }).waitFor();

  await context.setOffline(false);
  deliberatelyOffline = false;
  await page.reload({ waitUntil: "networkidle" });
  await waitForOfflineLabel(page, "Ready offline");
  if (logs.length > 0) {
    throw new Error(`Browser console was not clean:\n${logs.join("\n")}\nResponses:\n${failedResponses.join("\n")}`);
  }

  console.log(JSON.stringify({
    cacheVersion: offlineManifest.cacheVersion,
    requiredResources: offlineManifest.urls.length,
    offlineAudioFiles: offlineAudioResults.length,
    viewports: ["1440x900", "390x844", "844x390"],
    firstOfflineVisit: "truthfully unsupported",
    offlineReload: "passed",
    consoleWarningsOrErrors: logs.length,
  }, null, 2));
} finally {
  await closeContext(freshContext);
  await closeContext(context);
  if (browser) await browser.close().catch(() => undefined);
  await stopServer(server);
}
