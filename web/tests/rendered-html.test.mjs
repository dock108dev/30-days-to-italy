import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", origin = "http://localhost", forwardedHost, method = "GET") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`${origin}${pathname}`, {
      method,
      headers: {
        accept: "text/html",
        host: forwardedHost ?? new URL(origin).host,
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
  assert.match(response.headers.get("permissions-policy") ?? "", /microphone=\(\)/);
  assert.match(response.headers.get("permissions-policy") ?? "", /payment=\(\)/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src-attr 'none'/);

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

test("rejects unused methods and the unused image-transform surface", async () => {
  const post = await render("/", "http://localhost", undefined, "POST");
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  assert.equal(post.headers.get("cache-control"), "no-store");
  assert.match(post.headers.get("content-security-policy") ?? "", /default-src 'self'/);

  const image = await render("/_vinext/image?url=https://example.invalid/private&width=1920");
  assert.equal(image.status, 404);
  assert.equal(image.headers.get("cache-control"), "no-store");
  assert.equal(await image.text(), "Not found");
});

test("derives absolute social metadata from the deployed request origin", async () => {
  const response = await render("/", "https://thirty-days-italy-private.example");
  const html = await response.text();
  assert.match(html, /property="og:image" content="https:\/\/thirty-days-italy-private\.example\/og\.png"/i);
  assert.doesNotMatch(html, /localhost/i);
});

test("rejects unsafe forwarded hosts when deriving social metadata", async () => {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...items) => warnings.push(items);
  try {
    const response = await render("/", "http://localhost", "trusted.example@attacker.example");
    const html = await response.text();
    assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og\.png"/i);
    assert.doesNotMatch(html, /attacker\.example/i);
    assert.equal(warnings.some((items) => items.some((item) => item?.code === "INVALID_REQUEST_ORIGIN")), true);
  } finally {
    console.warn = originalWarn;
  }
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
  assert.match(page, /OperationalFailureBanner/);
  assert.match(page, /subscribeToClientFailures/);
  assert.match(styles, /\.operational-failure-banner/);
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
