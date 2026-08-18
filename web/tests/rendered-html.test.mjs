import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", origin = "http://localhost") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`${origin}${pathname}`, {
      headers: {
        accept: "text/html",
        host: new URL(origin).host,
        "x-forwarded-proto": new URL(origin).protocol.slice(0, -1),
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished prototype shell and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("permissions-policy"), "microphone=(), camera=(), geolocation=()");
  assert.equal(response.headers.get("x-frame-options"), "DENY");

  const html = await response.text();
  assert.match(html, /<title>30 Days to Italy — private trip rehearsal<\/title>/i);
  assert.match(html, /A personalized vacation rehearsal for practical independence in Italy\./i);
  assert.match(html, /<meta property="og:title" content="30 Days to Italy"/i);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/i);
  assert.match(html, /og\.png/i);
  assert.match(html, /content="noindex, nofollow, noarchive, nocache"/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost\/og\.png"/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("derives absolute social metadata from the deployed request origin", async () => {
  const response = await render("/", "https://thirty-days-italy-private.example");
  const html = await response.text();
  assert.match(html, /property="og:image" content="https:\/\/thirty-days-italy-private\.example\/og\.png"/i);
  assert.doesNotMatch(html, /localhost/i);
});

test("ships the player-facing save, support, teaching, and admin controls", async () => {
  const [page, views, styles, hosting] = await Promise.all([
    readFile(new URL("../app/prototype/PrototypeApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/prototype/PrototypeViews.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /saveGame\(runtime!\.storage, game\)/);
  assert.match(page, /loadActiveDemoSession/);
  assert.match(page, /startDemoSession/);
  assert.match(page, /exitDemoSession/);
  assert.match(page, /PrototypeHeader/);
  assert.match(page, /EncounterStage/);
  assert.match(page, /TeachingCard/);
  assert.match(page, /WorldPanel/);
  assert.match(page, /AdminModal/);
  assert.match(page, /TripSetup/);
  assert.match(page, /ModeNavigation/);
  assert.match(page, /CompactSessionProgress/);
  assert.match(page, /SeasonOverview/);
  assert.match(page, /onReview={openSeasonOverview}/);
  assert.doesNotMatch(page, /onReview=\{\(\) => setAdminOpen\(true\)\}/);
  assert.match(page, /onEditTrip={openTripEditor}/);
  assert.match(page, /PocketDeck/);
  assert.match(page, /clearAllLocalState\(storage\)/);
  assert.match(views, /Start demo walkthrough/);
  assert.match(views, /Reset demo only/);
  assert.match(views, /Remove owner journey data/);
  assert.match(views, /data-review-section="objective-result"/);
  assert.match(views, /data-review-section="understood-intent"/);
  assert.match(views, /data-review-section="useful-phrasing"/);
  assert.match(views, /data-review-section="world-consequence"/);
  assert.match(views, /data-review-section="pocket-deck-effect"/);
  assert.match(views, /data-review-section="next-action"/);
  assert.match(views, /Browse the other \{remainingLessons\.length\} patterns/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  const hostingConfig = JSON.parse(hosting);
  assert.equal(hostingConfig.d1, null);
  assert.equal(hostingConfig.r2, null);
  assert.match(hostingConfig.project_id, /^appgprj_[a-zA-Z0-9_-]+$/);
});

test("keeps every normal and careful audio line in exact parity", async () => {
  const normalRoot = new URL("../public/audio/normal/", import.meta.url);
  const carefulRoot = new URL("../public/audio/careful/", import.meta.url);
  const [normal, careful] = await Promise.all([
    readdir(normalRoot),
    readdir(carefulRoot),
  ]);

  assert.equal(normal.length > 0, true);
  assert.deepEqual(normal.sort(), careful.sort());
  await Promise.all(
    normal.flatMap((name) => [
      access(new URL(name, normalRoot)),
      access(new URL(name, carefulRoot)),
    ]),
  );
  await access(new URL("../public/og.png", import.meta.url));
});
