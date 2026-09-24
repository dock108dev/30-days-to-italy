# 30 Days to Italy

30 Days to Italy is a mobile-friendly rehearsal app for an Italian coastal trip. It provides 31 playable preparation sessions, a guided beach rehearsal, a device-local trip profile, persistent Prepare and Trip modes, and an offline Pocket Deck with 30 reviewed cards.

The player listens and types; the app never requests microphone access. Progress and trip details stay in the current browser. There is no account, analytics service, application API, or cross-device sync.

## Current limits

Teaching preparation is implemented for Days 0–1. Full-season teaching, targeted-review suggestions and varied practice are not yet implemented. Trip Mode and the Pocket Deck require valid Day 30 completion. See [product behavior](docs/PRODUCT.md).

## Quick start

Requires Node.js 22.13 or newer.

```bash
cd web
npm ci
npm run dev
```

Open the local address printed by the development server. Development mode does not register the production service worker.

To exercise the production and offline paths:

```bash
cd web
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

Visit `http://127.0.0.1:3001`, switch to Trip Mode, and wait for **Ready offline** before disconnecting. A first visit while disconnected is intentionally unsupported.

## Repository layout

- `web/` — the application, worker, local media, scripts, and automated tests.
- `docs/` — product, development, architecture, operations, security, and episode-authoring guidance.

## Validation

Run commands from `web/`:

```bash
npm run lint
npx tsc --noEmit
npm test
```

The full browser campaigns are slower and should be run for the areas they cover:

```bash
npm run test:interaction
npm run test:admin-demo
npm run test:checkpoint-hardening
npm run test:offline
```

See [Development](docs/DEVELOPMENT.md) for the complete command map and change boundaries.

## Documentation

- [Product behavior](docs/PRODUCT.md)
- [Day 0–1 teaching contract](docs/DAY_00_01_TEACHING_SPEC.md)
- [Development and validation](docs/DEVELOPMENT.md)
- [Architecture and source-of-truth boundaries](docs/ARCHITECTURE_AND_SSOT.md)
- [Episode authoring](docs/EPISODE_AUTHORING_GUIDE.md)
- [Error handling and operations](docs/ERROR_HANDLING_AND_OPERATIONS.md)
- [Security model](docs/SECURITY.md)

## Release boundary

The app has no built-in authentication. Admin controls are local review tools. Restrict hosted access at the hosting layer and verify its access controls and response headers before exposing the app. See [Error handling and operations](docs/ERROR_HANDLING_AND_OPERATIONS.md#build-and-deployment-boundary) for the release boundary.

## UI design

See [UI design](docs/ui-design.md) for the project’s styles and accessibility requirements.
