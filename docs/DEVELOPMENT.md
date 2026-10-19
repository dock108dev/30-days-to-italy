# Local development and focused checks

Updated October 7, 2026. Scope: personal use and a handful of users. [Working approach](personal-use.md).

Run commands from `web/`. Use Node.js 24, selected by the repository `.nvmrc` and CI, and the committed npm lockfile.

## Setup and local use

```sh
npm ci
npm run dev
```

No app credential, account, database or external data provider is required. To use service workers/offline assets, run the built local app:

```sh
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

The start command uses `scripts/start-worker.mjs` and Wrangler's local Worker runtime. Do not substitute a Node import of the Worker bundle. A build is needed for this local offline behavior, not a distribution milestone.

## Focused checks

Check the lesson or state behavior changed, then try it in the local browser. Available commands include lint, `npx tsc --noEmit`, `test:response-contracts` and `test:ssot`. `npm test` is the broader domain suite; use it when a shared change warrants it. Interaction/Admin/checkpoint/offline scripts are optional targeted tools. Do not require all campaigns, a fresh candidate freeze or missing historical evidence before owner feedback.

For offline changes, prepare while connected, wait for Ready offline and then check the affected retrieval/audio/reload while disconnected. Use a disposable profile for fixture-writing scripts; preserve owner progress.

## Dependencies and generated files

Keep lockfile/TypeScript aliases and patched dependency overrides coherent. Use existing dependency repair tools when a real update fails; check the affected build/runtime. Existing hosted CI is background maintenance, not a personal-use readiness campaign.

`npm run build` generates offline inventory/service-worker output; do not hand-edit it. Audio files are authored product assets. `npm run audio:generate` fills missing audio; `--force` replaces files and should be used only for reviewed transcript changes. Audio authoring needs macOS say/Alice and ffmpeg.

## Change boundaries

Season metadata and episodes own lesson content; the generic engine remains game-neutral. Persistence owns compatibility; preserve stable storage keys. Admin demos stay separate from real practice. The Pocket Deck catalog owns spoken transcripts. See [Architecture](ARCHITECTURE_AND_SSOT.md) and [Episode authoring](EPISODE_AUTHORING_GUIDE.md).

Extend full-season teaching, targeted review and bounded varied practice in useful slices. Preserve past access, existing future-day rules and valid Day 30 Trip Mode access. Phone/offline checks happen when that use is reached. Cross-device continuity remains later work.
