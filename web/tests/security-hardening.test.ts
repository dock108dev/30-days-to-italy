import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import test from "node:test";

import { PLAYER_RESPONSE_MAX_LENGTH } from "../app/game/model";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

test("runtime UI source has no raw HTML, dynamic evaluation, credentials, or outbound fetch", async () => {
  const appRoot = resolve(process.cwd(), "app");
  const files = await sourceFiles(appRoot);
  const sources = await Promise.all(files.map(async (file) => `${file}\n${await readFile(file, "utf8")}`));
  const source = sources.join("\n");

  assert.doesNotMatch(source, /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|new\s+Function\s*\(/);
  assert.doesNotMatch(source, /document\.cookie|localStorage\.setItem\([^\n]*(token|secret|password)/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z0-9_]*(TOKEN|SECRET|PASSWORD|KEY)/);
});

test("deployment configuration has no database or object-storage binding", async () => {
  const hosting = JSON.parse(await readFile(resolve(process.cwd(), ".openai/hosting.json"), "utf8"));
  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, null);
  assert.match(hosting.project_id, /^appgprj_[a-zA-Z0-9_-]+$/);
});

test("typed traveler responses have one shared bounded limit", async () => {
  assert.equal(PLAYER_RESPONSE_MAX_LENGTH, 500);
  const [engine, view] = await Promise.all([
    readFile(resolve(process.cwd(), "app/game/engine.ts"), "utf8"),
    readFile(resolve(process.cwd(), "app/prototype/PrototypeViews.tsx"), "utf8"),
  ]);
  assert.match(engine, /trim\(\)\.slice\(0, PLAYER_RESPONSE_MAX_LENGTH\)/);
  assert.match(view, /maxLength=\{PLAYER_RESPONSE_MAX_LENGTH\}/);
});
