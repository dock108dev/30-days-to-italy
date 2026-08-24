import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";

export const OFFLINE_CACHE_PREFIX = "thirty-days-to-italy-offline-";
export const OFFLINE_MANIFEST_SCHEMA_VERSION = 1 as const;

const INCLUDED_ROOT_FILES = new Set([
  "favicon.ico",
  "favicon.svg",
  "manifest.webmanifest",
]);
const INCLUDED_DIRECTORIES = ["_next/static/", "assets/", "audio/", "icons/"];

export type OfflineBuildManifest = {
  schemaVersion: typeof OFFLINE_MANIFEST_SCHEMA_VERSION;
  cacheVersion: string;
  requiredCount: number;
  audioCount: number;
  pocketDeckAudioCount: number;
  urls: string[];
};

export function normalizeClientRelativePath(clientRoot: string, file: string): string {
  return relative(clientRoot, file).split(sep).join("/");
}

export function shouldIncludeOfflineAsset(relativePath: string): boolean {
  if (!relativePath || relativePath.startsWith(".") || relativePath === "sw.js") return false;
  if (relativePath === "offline-manifest.json" || relativePath === "og.png") return false;
  if (INCLUDED_ROOT_FILES.has(relativePath)) return true;
  return INCLUDED_DIRECTORIES.some((prefix) => relativePath.startsWith(prefix));
}

export function offlineUrlsForRelativePaths(relativePaths: readonly string[]): string[] {
  const assetUrls = relativePaths
    .filter(shouldIncludeOfflineAsset)
    .map((path) => `/${path}`);
  return ["/", ...new Set(assetUrls)].sort((left, right) => {
    if (left === "/") return -1;
    if (right === "/") return 1;
    return left.localeCompare(right);
  });
}

export async function cacheVersionForFiles(
  clientRoot: string,
  files: readonly string[],
): Promise<string> {
  const hash = createHash("sha256");
  for (const file of [...files].sort()) {
    const relativePath = normalizeClientRelativePath(clientRoot, file);
    if (!shouldIncludeOfflineAsset(relativePath)) continue;
    hash.update(relativePath);
    hash.update(await readFile(file));
  }
  return hash.digest("hex").slice(0, 16);
}

export function createOfflineBuildManifest(
  cacheVersion: string,
  urls: readonly string[],
): OfflineBuildManifest {
  const audioUrls = urls.filter((url) => url.startsWith("/audio/"));
  const pocketDeckAudioUrls = urls.filter((url) =>
    url.startsWith("/audio/pocket-deck/"),
  );
  return {
    schemaVersion: OFFLINE_MANIFEST_SCHEMA_VERSION,
    cacheVersion,
    requiredCount: urls.length,
    audioCount: audioUrls.length,
    pocketDeckAudioCount: pocketDeckAudioUrls.length,
    urls: [...urls],
  };
}

export function renderServiceWorker(manifest: OfflineBuildManifest): string {
  return `/* Generated during npm run build. Do not edit by hand. */
const CACHE_PREFIX = ${JSON.stringify(OFFLINE_CACHE_PREFIX)};
const CACHE_VERSION = ${JSON.stringify(manifest.cacheVersion)};
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const REQUIRED_URLS = ${JSON.stringify(manifest.urls)};
const REQUIRED_PATHS = new Set(REQUIRED_URLS);

async function fetchRequired(url) {
  const response = await fetch(new Request(url, { cache: "reload" }));
  if (!response.ok) throw new Error(url + " returned " + response.status);
  return response;
}

async function populateCache({ missingOnly = false } = {}) {
  const cache = await caches.open(CACHE_NAME);
  for (const url of REQUIRED_URLS) {
    if (missingOnly && await cache.match(url)) continue;
    const response = await fetchRequired(url);
    await cache.put(url, response);
  }
  return cache;
}

async function installAtomically() {
  try {
    await populateCache();
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

async function networkIsAvailable() {
  try {
    const response = await fetch(new Request("/offline-manifest.json?network-probe=" + Date.now(), {
      cache: "no-store",
    }));
    return response.ok;
  } catch {
    return false;
  }
}

async function statusReport(reason) {
  try {
    const cache = await caches.open(CACHE_NAME);
    let cachedCount = 0;
    for (const url of REQUIRED_URLS) {
      if (await cache.match(url)) cachedCount += 1;
    }
    return {
      type: "OFFLINE_STATUS",
      ready: cachedCount === REQUIRED_URLS.length,
      cacheVersion: CACHE_VERSION,
      requiredCount: REQUIRED_URLS.length,
      cachedCount,
      networkAvailable: await networkIsAvailable(),
      ...(reason ? { reason } : {}),
    };
  } catch {
    return {
      type: "OFFLINE_STATUS",
      ready: false,
      cacheVersion: CACHE_VERSION,
      requiredCount: REQUIRED_URLS.length,
      cachedCount: 0,
      networkAvailable: await networkIsAvailable(),
      reason: "CACHE_STORAGE_UNAVAILABLE",
    };
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(installAtomically());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") {
    void self.skipWaiting();
    return;
  }
  if (event.data?.type !== "GET_OFFLINE_STATUS" && event.data?.type !== "REPAIR_OFFLINE_CACHE") {
    return;
  }
  event.waitUntil((async () => {
    let reason;
    if (event.data.type === "REPAIR_OFFLINE_CACHE") {
      try {
        await populateCache({ missingOnly: true });
      } catch {
        reason = "OFFLINE_REPAIR_FAILED";
      }
    }
    event.ports[0]?.postMessage(await statusReport(reason));
  })());
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/");
    return cached ?? new Response("30 Days to Italy is not ready offline on this device.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (REQUIRED_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(url.pathname);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        return new Response("Offline file unavailable", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
  }
});
`;
}
