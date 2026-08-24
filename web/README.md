# Web application

This directory contains the production application for 30 Days to Italy. The stable season registry exposes `day-00` through `day-30`; all sessions are playable. Prepare Mode owns rehearsal progress, while Trip Mode exposes the offline Pocket Deck without teaching, scoring, or simulated consequences.

## Requirements

- Node.js 22.13 or newer
- npm using the committed lockfile
- A Chromium-compatible browser for browser acceptance campaigns

No application environment variables or credentials are required for local work.

## Run locally

```bash
npm ci
npm run dev
```

Use a production server for service-worker or offline work:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

## Common checks

```bash
npm run lint
npx tsc --noEmit
npm run test:ssot
npm run test:response-contracts
npm run test:security
npm test
```

Browser acceptance commands are documented in [Development](../docs/DEVELOPMENT.md). Each browser campaign builds first, starts its own isolated loopback server, and shuts it down when complete.

## Local artifacts

- `npm run build` generates and verifies the production offline inventory and service worker.
- `npm run audio:generate` fills missing bundled audio. Use `npm run audio:generate -- --force` only when reviewed transcripts change. Generation requires macOS, the built-in `say` command, and `ffmpeg` on `PATH`; generated files are committed product assets.
- Browser evidence defaults to `../italian-pilot-evidence/local/` and can be redirected with `ITALY_EVIDENCE_ROOT`.

## Boundaries

- Browser state is divided into independent game, trip, lifecycle, guided-session, Pocket Deck, and isolated-demo domains.
- Admin review state is synthetic and namespaced; it must never be treated as owner practice.
- The service worker caches a fixed same-origin build inventory and never reads traveler state.
- The worker exposes no application API and accepts only `GET` and `HEAD`.

Start with the repository [README](../README.md), then use [Architecture](../docs/ARCHITECTURE_AND_SSOT.md) before changing season, persistence, or Admin behavior.
