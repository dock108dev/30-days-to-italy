import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Browser } from "playwright-core";
import { STORAGE_KEY } from "../app/game/model";

/** Fresh ordinary onboarding, followed by preserved-cache disconnected teaching. */
export async function verifyPreparationOffline(browser: Browser, baseUrl: string, evidenceRoot: string) {
  await mkdir(evidenceRoot, { recursive: true });
  const context = await browser.newContext({ serviceWorkers: "allow", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const warnings: string[] = [];
  const expectedOfflineNetwork: string[] = [];
  const requests: unknown[] = [];
  const records: unknown[] = [];
  let disconnected = false;
  page.on("console", (message) => {
    if (!["warning", "error"].includes(message.type())) return;
    if (disconnected && /ERR_INTERNET_DISCONNECTED|Failed to load resource/i.test(message.text())) {
      expectedOfflineNetwork.push(message.text());
    } else warnings.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (!disconnected || !request.url().includes("/offline-manifest.json?")) {
      warnings.push(`Unexpected failed request: ${request.url()} ${request.failure()?.errorText}`);
    }
  });
  page.on("pageerror", (error) => warnings.push(error.message));
  page.on("response", (response) => {
    requests.push({ url: response.url(), status: response.status(), fromServiceWorker: response.fromServiceWorker() });
    if (response.status() >= 400) warnings.push(`${response.status()} ${response.url()}`);
  });
  await context.addInitScript(() => {
    const OriginalAudio = window.Audio;
    const observed = window as unknown as { offlinePreparationClips: HTMLAudioElement[] };
    observed.offlinePreparationClips = [];
    window.Audio = function(src?: string) {
      const clip = new OriginalAudio(src);
      observed.offlinePreparationClips.push(clip);
      return clip;
    } as unknown as typeof Audio;
  });
  const snapshot = () => page.evaluate(async () => ({
    online: navigator.onLine,
    networkReachable: await fetch(`/offline-manifest.json?boundary-probe=${Date.now()}`, { cache: "no-store" }).then(() => true, () => false),
    controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    registrations: (await navigator.serviceWorker.getRegistrations()).map((item) => ({ scope: item.scope, active: item.active?.state })),
    caches: await Promise.all((await caches.keys()).map(async (name) => ({ name, count: (await (await caches.open(name)).keys()).length }))),
  }));
  const reloadOffline = async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    const boundary = await snapshot();
    assert.equal(boundary.networkReachable, false, "uncached network must remain unavailable after each reload");
    records.push({ boundary: "Disconnected reload", ...boundary });
  };
  try {
    await page.goto(baseUrl);
    await page.getByLabel("Departure date").fill("2026-09-15");
    await page.getByRole("button", { name: "Use these trip details" }).click();
    await page.getByRole("button", { name: "Prepare for check-in", exact: true }).waitFor();
    await page.getByRole("button", { name: "Trip", exact: true }).click();
    await page.locator('[data-offline-status="ready"]').waitFor({ timeout: 60_000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const connected = await snapshot();
    records.push({ boundary: "Ready offline after ordinary onboarding", ...connected });
    disconnected = true;
    await context.setOffline(true);
    await page.waitForFunction(() => navigator.onLine === false);
    assert.equal(await page.evaluate(async () => {
      try { await fetch(`/offline-manifest.json?disconnected-proof=${Date.now()}`, { cache: "no-store" }); return false; }
      catch { return true; }
    }), true, "uncached request must fail before disconnected teaching");
    records.push({ boundary: "Verified disconnection", ...await snapshot(), uncachedRequestFailed: true });
    await page.getByRole("button", { name: "Prepare", exact: true }).click();
    for (const day of [0, 1]) {
      await page.getByRole("button", { name: /^Prepare for / }).waitFor();
      await reloadOffline();
      await page.getByRole("button", { name: /^Prepare for / }).click();
      for (const speed of ["normal", "careful"]) {
        await page.getByRole("button", { name: `Play ${speed}`, exact: true }).click();
        await page.waitForFunction(() => {
          const clip = (window as unknown as { offlinePreparationClips: HTMLAudioElement[] }).offlinePreparationClips.at(-1);
          return Boolean(clip && clip.currentTime > .15 && clip.duration > 0);
        });
        records.push({ day, speed, playback: await page.evaluate(() => {
          const clip = (window as unknown as { offlinePreparationClips: HTMLAudioElement[] }).offlinePreparationClips.at(-1)!;
          return { src: clip.currentSrc, duration: clip.duration, time: clip.currentTime };
        }) });
        await page.getByRole("button", { name: "Stop audio", exact: true }).click();
      }
      await page.getByRole("button", { name: "Build a response" }).click();
      await reloadOffline();
      await page.getByRole("heading", { name: "Written example", exact: true }).waitFor();
      await page.screenshot({ path: resolve(evidenceRoot, `day-${day}-offline-pattern.png`), fullPage: true });
      await page.getByRole("button", { name: /^Continue to / }).click();
      await reloadOffline();
      await page.getByRole("button", { name: "Start conversation" }).click();
      await reloadOffline();
      await page.getByRole("button", { name: "Read the line", exact: true }).click();
      const composer = page.getByRole("textbox", { name: "Your response" });
      assert.equal(await composer.inputValue(), "");
      await composer.fill(day === 0 ? "Fuscoletti. Ho una prenotazione." : "Sono Michael. Sono qui per la chiave.");
      await page.getByRole("button", { name: "Respond", exact: true }).click();
      await page.getByRole("button", { name: "Continue conversation" }).waitFor();
      await reloadOffline();
      await page.getByRole("button", { name: "Continue conversation" }).click();
      await page.getByRole("button", { name: "Read the line", exact: true }).click();
      await composer.fill(day === 0 ? "Camera dodici, primo piano. Grazie." : "La porta verde, primo piano. Grazie.");
      await page.getByRole("button", { name: "Respond", exact: true }).click();
      await page.locator(".outcome-card").waitFor();
      await reloadOffline();
      await page.locator(".outcome-card").waitFor();
      const outcome = await page.evaluate((key) => {
        const game = JSON.parse(localStorage.getItem(key)!);
        return { completed: game.completed, resultCount: game.episodeResults[game.episodeId].length,
          preparation: game.episodeResults[game.episodeId].at(-1).preparation };
      }, STORAGE_KEY);
      assert.equal(outcome.resultCount, 1);
      assert.equal(outcome.completed.length, day + 1);
      assert.ok(outcome.preparation);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      records.push({ day, result: outcome, disconnected: await snapshot() });
      await page.screenshot({ path: resolve(evidenceRoot, `day-${day}-offline-result.png`), fullPage: true });
      if (day === 0) await page.getByRole("button", { name: "Continue to Day 1" }).click();
    }
    const offline = await snapshot();
    assert.equal(offline.networkReachable, false);
    await page.getByRole("button", { name: "Trip", exact: true }).click();
    await page.locator('[data-offline-status="offline"]').waitFor();
    records.push({ boundary: "Verified Offline badge after both days", ...await snapshot() });
    assert.ok(offline.controller);
    assert.deepEqual(offline.caches, connected.caches, "disconnected proof preserves complete cached inventory");
    assert.deepEqual(warnings, []);
    await writeFile(resolve(evidenceRoot, "results.json"), JSON.stringify({ status: "PASS", origin: baseUrl, records, warnings, expectedOfflineNetwork, requests }, null, 2));
  } catch (error) {
    await writeFile(resolve(evidenceRoot, "failure.json"), JSON.stringify({ error: String(error), records, warnings, expectedOfflineNetwork, requests }, null, 2));
    await page.screenshot({ path: resolve(evidenceRoot, "failed-screen.png"), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
    await writeFile(resolve(evidenceRoot, "cleanup.txt"), "Closed attempt-owned ordinary onboarding context; no owner state used.\n");
  }
}
