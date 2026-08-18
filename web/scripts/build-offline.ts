import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  REQUIRED_AUDIO_COUNT,
  REQUIRED_POCKET_DECK_AUDIO_COUNT,
  cacheVersionForFiles,
  createOfflineBuildManifest,
  normalizeClientRelativePath,
  offlineUrlsForRelativePaths,
  renderServiceWorker,
} from "../build/offline-assets";

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

const clientRoot = resolve(process.cwd(), "dist", "client");
const publicRoot = resolve(process.cwd(), "public");
const mode = process.argv[2];
if (mode !== "prepare" && mode !== "verify") {
  throw new Error("Use build-offline.ts with either prepare or verify.");
}
const files = await listFiles(clientRoot);
const relativePaths = files.map((file) => normalizeClientRelativePath(clientRoot, file));
const urls = offlineUrlsForRelativePaths(relativePaths);
const cacheVersion = await cacheVersionForFiles(clientRoot, files);
const manifest = createOfflineBuildManifest(cacheVersion, urls);

if (manifest.audioCount !== REQUIRED_AUDIO_COUNT) {
  throw new Error(`Expected ${REQUIRED_AUDIO_COUNT} audio files, found ${manifest.audioCount}.`);
}
if (manifest.pocketDeckAudioCount !== REQUIRED_POCKET_DECK_AUDIO_COUNT) {
  throw new Error(
    `Expected ${REQUIRED_POCKET_DECK_AUDIO_COUNT} Pocket Deck audio files, found ${manifest.pocketDeckAudioCount}.`,
  );
}

const webManifest = JSON.parse(
  await readFile(resolve(clientRoot, "manifest.webmanifest"), "utf8"),
) as { name?: unknown };
if (webManifest.name !== "30 Days to Italy") {
  throw new Error("The production web manifest is missing or invalid.");
}

const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
const workerSource = renderServiceWorker(manifest);

if (mode === "prepare") {
  await writeFile(resolve(publicRoot, "offline-manifest.json"), manifestSource, "utf8");
  await writeFile(resolve(publicRoot, "sw.js"), workerSource, "utf8");
} else {
  const [builtManifest, builtWorker] = await Promise.all([
    readFile(resolve(clientRoot, "offline-manifest.json"), "utf8"),
    readFile(resolve(clientRoot, "sw.js"), "utf8"),
  ]);
  if (builtManifest !== manifestSource) {
    throw new Error("The second build changed the offline asset inventory.");
  }
  if (builtWorker !== workerSource) {
    throw new Error("The production service worker does not match its verified inventory.");
  }
}

console.log(
  `Offline cache ${manifest.cacheVersion} ${mode}: ${manifest.requiredCount} resources, ${manifest.audioCount} audio files.`,
);
