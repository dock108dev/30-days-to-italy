import { buildOfflineArtifacts, type OfflineBuildMode } from "../build/offline-build";

const mode = process.argv[2];
if (mode !== "seed" && mode !== "prepare" && mode !== "verify") {
  throw new Error("Use build-offline.ts with seed, prepare, or verify.");
}
await buildOfflineArtifacts(mode as OfflineBuildMode);
