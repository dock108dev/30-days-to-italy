import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  OFFLINE_CACHE_PREFIX,
  REQUIRED_AUDIO_COUNT,
  REQUIRED_POCKET_DECK_AUDIO_COUNT,
  cacheVersionForFiles,
  createOfflineBuildManifest,
  offlineUrlsForRelativePaths,
  renderServiceWorker,
  shouldIncludeOfflineAsset,
} from "../build/offline-assets";
import {
  OFFLINE_UNAVAILABLE,
  readinessFromWorkerReport,
  type OfflineWorkerReport,
} from "../app/offline/model";

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("the install manifest is standalone, local, and carries complete icon metadata", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  };

  assert.equal(manifest.name, "30 Days to Italy");
  assert.equal(manifest.short_name, "30 Days");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 3);
  assert.equal(manifest.icons.every((icon) => icon.src.startsWith("/icons/")), true);
  assert.equal(manifest.icons.every((icon) => icon.type === "image/png"), true);
  assert.equal(manifest.icons.some((icon) => icon.purpose === "maskable"), true);

  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.deepEqual(pngDimensions(bytes), { width, height });
  }
});

test("the offline inventory derives and includes every required audio file", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../dist/client/offline-manifest.json", import.meta.url), "utf8"),
  ) as ReturnType<typeof createOfflineBuildManifest>;

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.cacheVersion.length, 16);
  assert.equal(manifest.requiredCount, manifest.urls.length);
  assert.equal(manifest.audioCount, REQUIRED_AUDIO_COUNT);
  assert.equal(manifest.pocketDeckAudioCount, REQUIRED_POCKET_DECK_AUDIO_COUNT);
  assert.equal(manifest.urls[0], "/");
  assert.equal(manifest.urls.includes("/manifest.webmanifest"), true);
  assert.equal(manifest.urls.includes("/icons/icon-maskable-512.png"), true);
  assert.equal(manifest.urls.some((url) => /^\/_next\/static\/.*\.js$/.test(url)), true);
  assert.equal(manifest.urls.some((url) => /^\/_next\/static\/.*\.css$/.test(url)), true);
  assert.equal(manifest.urls.includes("/og.png"), false);
  assert.equal(new Set(manifest.urls).size, manifest.urls.length);
});

test("offline asset selection excludes deployment metadata and generated worker files", () => {
  assert.equal(shouldIncludeOfflineAsset("assets/app-123.js"), true);
  assert.equal(shouldIncludeOfflineAsset("_next/static/chunks/app-123.js"), true);
  assert.equal(shouldIncludeOfflineAsset("audio/normal/line.m4a"), true);
  assert.equal(shouldIncludeOfflineAsset("icons/icon-192.png"), true);
  assert.equal(shouldIncludeOfflineAsset("manifest.webmanifest"), true);
  assert.equal(shouldIncludeOfflineAsset(".vite/manifest.json"), false);
  assert.equal(shouldIncludeOfflineAsset("offline-manifest.json"), false);
  assert.equal(shouldIncludeOfflineAsset("sw.js"), false);
  assert.equal(shouldIncludeOfflineAsset("og.png"), false);
  assert.deepEqual(
    offlineUrlsForRelativePaths([
      "sw.js",
      "audio/normal/line.m4a",
      "assets/app.js",
      "assets/app.js",
    ]),
    ["/", "/assets/app.js", "/audio/normal/line.m4a"],
  );
});

test("cache versions are deterministic and change with required asset contents", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "italy-offline-test-"));
  const asset = resolve(directory, "manifest.webmanifest");
  try {
    await writeFile(asset, "first", "utf8");
    const first = await cacheVersionForFiles(directory, [asset]);
    const repeated = await cacheVersionForFiles(directory, [asset]);
    await writeFile(asset, "second", "utf8");
    const changed = await cacheVersionForFiles(directory, [asset]);
    assert.equal(first, repeated);
    assert.notEqual(first, changed);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("generated worker installs atomically, repairs gaps, and cleans only its own old caches", async () => {
  const manifest = createOfflineBuildManifest("abc123", [
    "/",
    "/assets/app.js",
    "/audio/pocket-deck/normal/card.m4a",
  ]);
  const source = renderServiceWorker(manifest);

  assert.match(source, new RegExp(OFFLINE_CACHE_PREFIX));
  assert.match(source, /await caches\.delete\(CACHE_NAME\);\n    throw error;/);
  assert.match(source, /REPAIR_OFFLINE_CACHE/);
  assert.match(source, /populateCache\(\{ missingOnly: true \}\)/);
  assert.match(source, /name\.startsWith\(CACHE_PREFIX\) && name !== CACHE_NAME/);
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /await self\.clients\.claim\(\)/);
  assert.match(source, /event\.data\?\.type === "ACTIVATE_UPDATE"/);
  assert.match(source, /networkIsAvailable/);
  assert.match(source, /offline-manifest\.json\?network-probe=/);
  assert.match(source, /reason: "CACHE_STORAGE_UNAVAILABLE"/);
  assert.match(source, /reason = "OFFLINE_REPAIR_FAILED"/);
  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /localStorage|indexedDB|https:\/\//);
});

test("offline labels are derived from verified inventory status, not connectivity alone", () => {
  const readyReport: OfflineWorkerReport = {
    type: "OFFLINE_STATUS",
    ready: true,
    cacheVersion: "cache-1",
    requiredCount: 107,
    cachedCount: 107,
  };
  assert.deepEqual(readinessFromWorkerReport(readyReport, true), {
    state: "ready",
    label: "Ready offline",
    detail: "This Pocket Deck and its audio are ready if the connection disappears.",
    cacheVersion: "cache-1",
  });
  assert.equal(readinessFromWorkerReport(readyReport, false).label, "Offline");
  assert.equal(
    readinessFromWorkerReport({ ...readyReport, networkAvailable: false }, true).label,
    "Offline",
  );
  assert.equal(
    readinessFromWorkerReport({ ...readyReport, ready: false, cachedCount: 106 }, true).state,
    "unavailable",
  );
  assert.equal(OFFLINE_UNAVAILABLE.label, "Offline files unavailable");
});

test("service-worker registration is production-only and cannot mutate traveler state", async () => {
  const source = await readFile(
    new URL("../app/offline/useOfflineReadiness.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /process\.env\.NODE_ENV !== "production"/);
  assert.match(source, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(source, /updateViaCache: "none"/);
  assert.match(source, /OFFLINE_UNAVAILABLE/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|clearAllLocalState/);
});
