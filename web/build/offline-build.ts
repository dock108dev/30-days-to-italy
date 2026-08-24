import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  cacheVersionForFiles,
  createOfflineBuildManifest,
  normalizeClientRelativePath,
  offlineUrlsForRelativePaths,
  renderServiceWorker,
} from "./offline-assets";
import {
  REQUIRED_AUDIO_COUNT,
  REQUIRED_POCKET_DECK_AUDIO_COUNT,
} from "./offline-catalog";

export type OfflineBuildMode = "seed" | "prepare" | "verify";

const ROUTE_PLACEHOLDER = "Generated after the production client build.\n";

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(root, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

export async function buildOfflineArtifacts(
  mode: OfflineBuildMode,
  root = process.cwd(),
): Promise<void> {
  const clientRoot = resolve(root, "dist", "client");
  const publicRoot = resolve(root, "public");

  if (mode === "seed") {
    // Vinext snapshots public asset paths during compilation. Reserve these
    // routes before the build, then replace their contents once the complete
    // client inventory (including fonts and route manifests) exists.
    await Promise.all([
      writeFile(resolve(publicRoot, "offline-manifest.json"), ROUTE_PLACEHOLDER, "utf8"),
      writeFile(resolve(publicRoot, "sw.js"), ROUTE_PLACEHOLDER, "utf8"),
    ]);
    console.log("Reserved offline asset routes for the production build.");
    return;
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
    await Promise.all([
      writeFile(resolve(publicRoot, "offline-manifest.json"), manifestSource, "utf8"),
      writeFile(resolve(publicRoot, "sw.js"), workerSource, "utf8"),
      writeFile(resolve(clientRoot, "offline-manifest.json"), manifestSource, "utf8"),
      writeFile(resolve(clientRoot, "sw.js"), workerSource, "utf8"),
    ]);
  } else {
    const [builtManifest, builtWorker] = await Promise.all([
      readFile(resolve(clientRoot, "offline-manifest.json"), "utf8"),
      readFile(resolve(clientRoot, "sw.js"), "utf8"),
    ]);
    if (builtManifest !== manifestSource) {
      throw new Error("The built offline asset inventory does not match its manifest.");
    }
    if (builtWorker !== workerSource) {
      throw new Error("The production service worker does not match its verified inventory.");
    }
  }

  console.log(
    `Offline cache ${manifest.cacheVersion} ${mode}: ${manifest.requiredCount} resources, ${manifest.audioCount} audio files.`,
  );
}
