import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { adminFastTrackCheckpoint } from "../app/admin/fast-track";
import { SEASON_01 } from "../app/season/manifest";
import { IMPLEMENTED_EPISODE_DEFINITIONS } from "../app/season/registry";
import { scheduleSeason } from "../app/season/schedule";

async function source(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), "utf8");
}

test("the manifest and registered definitions expose one current 31-session season", () => {
  assert.deepEqual(
    SEASON_01.map((episode) => episode.id),
    IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.id),
  );
  assert.equal(SEASON_01.length, 31);
  assert.equal(scheduleSeason({ departureDate: "2026-09-02" }, [], "2026-09-02").every((episode) => episode.playable), true);
  assert.throws(
    () => adminFastTrackCheckpoint("unsupported" as "trip"),
    /Unsupported Admin checkpoint/,
  );
});

test("removed season and interaction compatibility paths cannot return", async () => {
  const [manifest, model, engine, episodeTypes] = await Promise.all([
    source("app/season/manifest.ts"),
    source("app/game/model.ts"),
    source("app/game/engine.ts"),
    source("app/season/types.ts"),
  ]);

  assert.doesNotMatch(manifest, /planned|IMPLEMENTED_EPISODES|EpisodeStatus/);
  assert.doesNotMatch(model, /export\s*\{[^}]*\b(?:OUTCOMES|SCENES|TURNS|sceneForEpisode)\b/);
  assert.doesNotMatch(engine, /seedLegacyAnchorState|LEGACY_ANCHORS/);
  assert.doesNotMatch(episodeTypes, /terminalBehavior/);
});

test("the production build has no inactive database, object-storage, or migration adapter", async () => {
  const [vite, sitesPlugin] = await Promise.all([
    source("vite.config.ts"),
    source("build/sites-vite-plugin.ts"),
  ]);

  assert.doesNotMatch(vite, /d1_databases|r2_buckets|SITE_CREATOR_PLACEHOLDER_DATABASE_ID/);
  assert.doesNotMatch(sitesPlugin, /drizzle|exists\(/);
  await assert.rejects(access(resolve(process.cwd(), "next.config.ts")), { code: "ENOENT" });
});
