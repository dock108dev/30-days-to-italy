# Development guide

Run all application commands from `web/`.

## Setup and local use

The project requires Node.js 22.13 or newer and uses the committed npm lockfile.

```bash
npm ci
npm run dev
```

No application environment file, credential, database, or external provider is required. The build uses the checked-in Sites and Wrangler configuration. Do not add secrets to repository files, logs, screenshots, or test evidence.

Production and offline behavior require a production build:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

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

Use `npm test` as the behavioral authority. Add the focused or browser campaign that covers the changed boundary. Browser campaigns create isolated loopback servers and write evidence to `../italian-pilot-evidence/candidate-20260823/` by default; set `ITALY_EVIDENCE_ROOT` to redirect it. Unexpected warnings or errors invalidate the run.

There is no separate formatter script. ESLint and the existing TypeScript style are the repository standard.

## Change boundaries

- `app/season/manifest.ts` owns stable season metadata; `app/season/episodes/` owns episode behavior; `app/season/registry.ts` derives runtime catalogs.
- `app/game/engine.ts` is the generic coordinator. Do not add episode-specific branches there.
- `app/game/persistence.ts` is the only compatibility boundary for old game saves.
- `app/admin/` and `app/persistence/session.ts` own isolated review behavior and exact owner restoration.
- `app/pocket-deck/catalog.ts` owns the reviewed card catalog and spoken transcripts.
- `scripts/build-offline.ts` owns the generated offline inventory and service worker. Do not hand-edit generated offline output.

Read [Architecture and SSOT](ARCHITECTURE_AND_SSOT.md) before changing these boundaries and [Episode authoring](EPISODE_AUTHORING_GUIDE.md) before modifying a session.

## Large files retained intentionally

The following source or test files remain over roughly 500 lines after cleanup:

- `app/prototype/PrototypeApp.tsx` — cohesive browser orchestration across independent persistence domains, audio, focus, and session-generation guards. A safe split requires a dedicated state-hook refactor and browser regression campaign.
- `app/prototype/PrototypeViews.tsx` — cohesive traveler-facing rehearsal, teaching, result, and world views whose props share the interaction contract.
- `app/game/model.ts` — stable shared state types, phrase content, response limits, and defaults used across the application and migrations.
- `app/game/persistence.ts` — one strict, versioned hydration and migration boundary; splitting schema versions would obscure normalization order.
- `app/pocket-deck/PocketDeckViews.tsx` — one stateful deck/search/detail/show interaction with tightly coupled focus behavior.
- `scripts/interaction-acceptance.ts` and `scripts/checkpoint-hardening.ts` — sequential end-to-end campaigns whose shared browser state and evidence make extraction less readable.
- `tests/pocket-deck.test.ts` and `tests/final-season.test.ts` — domain matrices that keep setup and invariants visible beside their assertions.

These are review notes, not a permanent size exemption. Split a file when a change exposes a stable seam and the relevant behavioral gate can prove the extraction.
