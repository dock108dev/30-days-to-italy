# Development guide

Run all application commands from `web/`.

## Setup and local use

The project requires Node.js 22.13 or newer and uses npm with the committed lockfile. Browser acceptance additionally requires Google Chrome or Chromium; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when it is not installed in a standard macOS location or discoverable on `PATH` in CI.

```bash
npm ci
npm run dev
```

No application environment file, credential, database, or external provider is required. The build uses `vite.config.ts`, the local Worker entry, and checked-in `.openai/hosting.json` metadata. Do not add secrets to repository files, logs, screenshots, or test evidence.

Typechecking uses TypeScript 7.0.2 through the `@typescript/native` npm alias (`npx tsc`). The `typescript` dependency aliases `@typescript/typescript6` for ESLint and other tools that require the compiler API, following [Microsoft's compatibility guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0). Keep both aliases when updating TypeScript until the lint tooling supports the new compiler API.

Production and offline behavior require a production build:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

## Dependency updates

Dependabot groups all `/web` npm version updates into one weekly PR with one
lockfile. Security updates use a separate group and are not delayed until the
weekly version-update run. Keep production and development dependencies in the
same group: React's renderer and type packages span both sections, and the build
tools also share peer dependencies.

When updating React manually, update `react`, `react-dom`, and
`react-server-dom-webpack` together to the same runtime version. Update
`@types/react` and `@types/react-dom` together to versions satisfying their peer
ranges; their patch versions do not have to match. Regenerate `package-lock.json`
with npm, then run `npm ci`, lint, TypeScript, and the build/test and browser
checks below. Do not bypass peer checks with `--force` or `--legacy-peer-deps`.

Grouping reduces split updates and conflicting lockfile PRs; it cannot guarantee
that every upstream release is compatible. Merge only after `Application checks`,
`Browser acceptance`, and `Secret scan` pass on the current PR revision. If an
older individual Dependabot PR remains open after grouping changes, replace it
with the grouped update instead of merging its stale dependency set.

## Configuration and generated files

The deployed application reads no runtime environment variables. The following variables affect only local tooling and acceptance:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Selects the browser executable for acceptance campaigns. | Standard macOS Chrome/Chromium paths; CI discovers a runner browser. |
| `ITALY_EVIDENCE_ROOT` | Redirects interaction, Admin, and checkpoint screenshots/results. | `../italian-pilot-evidence/local/` from `web/`. |
| `CHECKPOINT_HARDENING_ONLY` | Runs one checkpoint such as `day-24`; invalid identifiers fail immediately. | All Day 0–30 checkpoints. |
| `WRANGLER_LOG_PATH` | Redirects local Wrangler/Vinext diagnostics. | Package scripts use `.wrangler/wrangler.log`. |
| `WRANGLER_WRITE_LOGS` | Enables Wrangler log persistence when explicitly set. | `false` in `vite.config.ts`. |
| `MINIFLARE_REGISTRY_PATH` | Redirects Miniflare's local registry. | `.wrangler/registry`. |
| `CODEX_SANDBOX` | Enables polling and disables the inspector for the Codex Seatbelt preview only. | Unset for ordinary development. |

`npm run build` generates `public/offline-manifest.json` and `public/sw.js`, verifies them, and packages `.openai/hosting.json` into `dist/.openai/hosting.json`. These outputs, `dist/`, `.wrangler/`, TypeScript build metadata, environment files, and dependencies are ignored. Do not hand-edit generated offline files.

Bundled audio is different: files under `public/audio/` are committed product assets. `npm run audio:generate` fills missing registry-owned files; `npm run audio:generate -- --force` replaces matching files. Audio generation is an optional authoring operation that requires macOS, `/usr/bin/say` with the Alice voice, and `ffmpeg` on `PATH`. Normal setup, build, and tests do not generate audio.

## Validation map

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint and repository style rules |
| `npx tsc --noEmit` | TypeScript checking |
| `npm run test:ssot` | Static architecture and source-of-truth guardrails |
| `npm run test:response-contracts` | Focused response and truth matrices |
| `npm run test:security` | Production build, rendered HTML, headers, input, persistence, and offline hardening |
| `npm test` | Production build and complete automated domain suite |
| `npm run test:interaction` | Real-browser interaction, audio, teaching, focus, and reload campaign |
| `npm run test:admin-demo` | Isolated Admin walkthrough and owner restoration campaign |
| `npm run test:checkpoint-hardening` | Full checkpoint and conditional-truth browser campaign |
| `npm run test:offline` | Connected preparation, cache repair, disconnected reload, media, and responsive browser campaign |
| `git diff --check` | Whitespace and patch hygiene |

Use `npm test` as the behavioral authority. Add the focused or browser campaign that covers the changed boundary. Browser campaigns create isolated loopback servers and write evidence to `../italian-pilot-evidence/local/` by default; set `ITALY_EVIDENCE_ROOT` to redirect it. Unexpected warnings or errors invalidate the run.

GitHub Actions exposes three stable checks for pull requests and pushes to `main`: `Application checks`, `Browser acceptance`, and `Secret scan`. Together they run the locked install, lint, TypeScript, production build and tests, all four browser campaigns, a high-severity production dependency audit, and a full-history secret scan. Browser campaigns use the hosted runner's Chromium-compatible browser; failed application or browser runs upload short-lived diagnostics. Action versions are pinned to immutable commits in `.github/workflows/ci.yml`.

There is no separate formatter script. ESLint and the existing TypeScript style are the repository standard.

## Change boundaries

- `app/season/manifest.ts` owns stable season metadata; `app/season/episodes/` owns episode behavior; `app/season/registry.ts` derives runtime catalogs.
- `app/game/engine.ts` is the generic coordinator. Do not add episode-specific branches there.
- `app/game/persistence.ts` is the only compatibility boundary for old game saves.
- `app/admin/` and `app/persistence/session.ts` own isolated review behavior and exact owner restoration.
- `app/prototype/useApplicationSession.ts` owns domain hydration, persistence save guards, and owner/demo session activation. `usePrototypePresentation.ts` owns transient interaction, focus, audio, modal, and warning presentation state.
- `app/pocket-deck/catalog.ts` owns the reviewed card catalog and spoken transcripts.
- `scripts/build-offline.ts` owns the generated offline inventory and service worker. Do not hand-edit generated offline output.

Read [Architecture and SSOT](ARCHITECTURE_AND_SSOT.md) before changing these boundaries and [Episode authoring](EPISODE_AUTHORING_GUIDE.md) before modifying a session.

## Large files retained intentionally

The following source or test files remain over roughly 500 lines after cleanup:

- `app/prototype/PrototypeApp.tsx` — event coordination and composition across the extracted session and presentation hooks. The remaining handlers share current encounter state; further extraction should follow a stable action-domain seam rather than only a line-count target.
- `app/prototype/PrototypeViews.tsx` — cohesive traveler-facing rehearsal, teaching, result, and world views whose props share the interaction contract.
- `app/game/model.ts` — stable shared state types, phrase content, response limits, and defaults used across the application and migrations.
- `app/game/persistence.ts` — one strict, versioned hydration and migration boundary; splitting schema versions would obscure normalization order.
- `app/pocket-deck/PocketDeckViews.tsx` — one stateful deck/search/detail/show interaction with tightly coupled focus behavior.
- `scripts/interaction-acceptance.ts` and `scripts/checkpoint-hardening.ts` — sequential end-to-end campaigns whose shared browser state and evidence make extraction less readable.
- `tests/pocket-deck.test.ts` and `tests/final-season.test.ts` — domain matrices that keep setup and invariants visible beside their assertions.

These are review notes, not a permanent size exemption. Split a file when a change exposes a stable seam and the relevant behavioral gate can prove the extraction.

## Preparation and integrated verification

After `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:ssot`, and `npm run test:response-contracts`, run the focused engineering browser script against the current production build:

```bash
ITALY_EVIDENCE_ROOT=/absolute/disposable/evidence/attempt-1 node --import tsx scripts/preparation-acceptance.ts
```

The script checks port 3114 is available, launches its own production server at `http://127.0.0.1:3114`, and uses a disposable temporary Chromium profile. It does not use the retained localhost:3000 owner journey or owner Chrome profile. Each attempt needs a fresh evidence root; failures retain a record and screenshot. The script closes its browser, deletes only its own profile, and stops its server in `finally`.

Coverage includes real onboarding, current-day overview resume, ordinary Day 1 selection, legacy later-turn keys/feedback, no-authoritative-effects checks, keyboard/focus, 390px controls/overflow, real normal/careful media for every preparation segment, explicit failed/stale media lanes, owner/demo restoration, and a later-day live-flow check. Media telemetry verifies actual decoding/time progression, and Day 0 entry reaches natural end. It does not claim human listening-quality judgment or comprehension.

The focused preparation script additionally traverses complete entry, pattern, handoff, later-brief and result paths at 1440×900, 390×844 and 844×390. It covers text readiness/counting, draft/help/focus detours, duplicate actions, partial retry, preparation/live/detour/result reloads, frozen summaries and replay. `scripts/preparation-navigation.ts` lets existing interaction/help/feedback/Admin/checkpoint campaigns traverse ordinary teaching controls before live actions; it never seeds traversal or submits examples.

Preserve each failed attempt before repair and rerun from a fresh browser/server boundary. Keep focused UI checks separate from integrated browser/offline/security checks and setup-warning disposition. Response/help/feedback/deck matrices run under `npm test`. Focused results do not establish a frozen candidate or owner acceptance.

The ordinary preparation lane runs with service-worker interception enabled and captures controller/registration state, cache names/counts, and browser Network/Log events. Its warning gate remains strict. A run that bypasses the service worker establishes only focused UI/localStorage behavior; it cannot replace ordinary or offline qualification. Prior attempts belong in [engineering history](history/day-00-01-teaching-record.md).

`npm run test:offline` retains the existing seeded Pocket Deck lane (obsolete-cache cleanup, connected repair, disconnected media/navigation/reload, and connected update verification). It additionally calls `scripts/preparation-offline.ts` in a fresh browser process: actual onboarding and Ready offline precede disconnected Day 0–1 teaching, real normal/careful audio, ordinary responses and reloads at preparation/pattern/handoff/live/brief/result boundaries. Uncached network requests must fail after each teaching reload, the final badge must be Offline, and the cache inventory must remain complete; `navigator.onLine` is recorded as a hint, not used alone as network proof. Synthetic stored fixtures in the earlier lane remain separate from this ordinary journey. Neither lane establishes learning or owner acceptance.

The interaction keyboard lane traverses both initial preparation and later briefs with Tab/Enter and checks visible focus. Updated interaction/offline scripts retain failure screenshots and cleanup records. Use a separate `ITALY_EVIDENCE_ROOT` for each browser command and attempt: help and feedback share viewport screenshot filenames. All-checkpoint qualification must omit `CHECKPOINT_HARDENING_ONLY`.

Candidate preparation and owner review are separate gates. See the [engineering history](history/day-00-01-teaching-record.md) for prior evidence and the [active tracker](/Users/michaelfuscoletti/Desktop/italy_next_steps.md) for current qualification status.