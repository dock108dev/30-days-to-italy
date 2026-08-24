import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_POCKET_DECK_CARDS } from "../app/pocket-deck/catalog";
import { TURNS } from "../app/season/registry";

type AudioSpec = { path: string; transcript: string; rate: number };

const root = fileURLToPath(new URL("..", import.meta.url));
const force = process.argv.includes("--force");
const requestedIds = new Set(process.argv.slice(2).filter((argument) => !argument.startsWith("--")));
const specs: AudioSpec[] = [
  ...Object.values(TURNS).flatMap((turn) => [
    { path: turn.normal, transcript: turn.text, rate: 185 },
    { path: turn.careful, transcript: turn.text, rate: 135 },
  ]),
  ...CORE_POCKET_DECK_CARDS.flatMap((card) => [
    { path: card.normalAudio, transcript: card.audioTranscript, rate: 185 },
    { path: card.carefulAudio, transcript: card.audioTranscript, rate: 135 },
  ]),
];

const selected = requestedIds.size === 0
  ? specs
  : specs.filter((spec) => [...requestedIds].some((id) => spec.path.endsWith(`/${id}.m4a`)));
const pending = selected.filter((spec) => force || !existsSync(join(root, "public", spec.path)));
const working = mkdtempSync(join(tmpdir(), "italy-audio-"));

try {
  pending.forEach((spec, index) => {
    const target = join(root, "public", spec.path);
    const source = join(working, `source-${index}.aiff`);
    mkdirSync(dirname(target), { recursive: true });

    const spoken = spawnSync("/usr/bin/say", [
      "-v", "Alice", "-r", String(spec.rate), "-o", source, spec.transcript,
    ], { encoding: "utf8" });
    if (spoken.status !== 0) throw new Error(spoken.stderr || `say failed for ${spec.path}`);

    const encoded = spawnSync("/opt/homebrew/bin/ffmpeg", [
      "-y", "-loglevel", "error", "-i", source,
      "-c:a", "aac", "-b:a", "96k", target,
    ], { encoding: "utf8" });
    if (encoded.status !== 0) throw new Error(encoded.stderr || `ffmpeg failed for ${spec.path}`);

    if ((index + 1) % 20 === 0 || index + 1 === pending.length) {
      console.log(`Generated ${index + 1} / ${pending.length}`);
    }
  });
} finally {
  rmSync(working, { recursive: true });
}

console.log(pending.length ? `Generated ${pending.length} missing audio assets.` : "Audio registry already complete.");
