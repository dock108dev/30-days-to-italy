# Architecture and single sources of truth

Application paths in this document are relative to `web/`. Run validation commands from that directory.

This document records the supported production paths for the current owner-only PWA. A module is authoritative when the production entry point calls it directly or when it owns persisted data that the entry point hydrates. Historical implementation stages are not supported modes.

## Authority map

### Application routing and rendering

- **SSOT:** `app/page.tsx` routes `/` directly to `app/prototype/PrototypeApp.tsx`.
- **Why:** this is the only application page and the only mounted client state coordinator.
- **Known callers:** the Vinext app-router entry, rendered-shell tests, and browser acceptance campaigns.

### HTTP and deployment boundary

- **SSOT:** `worker/index.ts` is the request entry; `vite.config.ts` names that worker; `.openai/hosting.json` is the required Sites metadata.
- **Why:** the worker is the only HTTP interceptor and the app has no API route, server action, database, object storage, upload, callback, or background-job binding.
- **Known callers:** Vinext/Cloudflare Vite build and local production acceptance.

### Season metadata and ordering

- **SSOT:** `app/season/manifest.ts` owns the exact Day 0–30 identifiers, ordering, scheduling metadata, content metadata, and lookup map.
- **Why:** all 31 sessions are current. There is no planned/implemented feature state or placeholder fallback.
- **Known callers:** episode definitions, scheduling, Admin navigation, persistence validation, overview rendering, and acceptance scripts.

### Episode behavior and catalogs

- **SSOT:** the 31 `app/season/episodes/day-*.ts` definitions register once through `app/season/registry.ts`.
- **Why:** each definition owns its scene, turns, outcomes, interpretation, observations, Admin seed, and result construction. The registry derives scene, turn, outcome, ownership, and pending-terminal indexes from those definitions.
- **Known callers:** the game coordinator, persistence validation, Admin canonical execution, rendering, audio/offline generation, and tests.

`app/season/canonical-demo-fixtures.ts` is authoring data assembled into registered definitions only. Runtime and acceptance callers consume `definition.canonicalDemo`; they do not execute the fixture file as an alternate engine.

### Interaction and state transitions

- **SSOT:** `app/game/engine.ts` owns the generic registered coordinator.
- **Why:** `submitEpisodeResponse` is the production transaction boundary. `applyResponse` is its deliberate first phase so persistence tests can exercise a historically saved pending terminal before `finishPendingOutcome` finalizes it exactly once. Episode-specific branches remain in their owning definitions.
- **Known callers:** `PrototypeApp`, Admin canonical execution, response-contract tests, persistence/reload tests, and checkpoint acceptance.

### Scheduling and lifecycle policy

- **SSOT:** `app/season/schedule.ts` derives unlocks from the manifest; `app/lifecycle/model.ts` owns the Prepare/Trip mode state.
- **Why:** there is one current 31-session schedule and one persisted lifecycle mode. Admin bypass only affects unlock visibility in an isolated demo session.
- **Known callers:** `PrototypeApp`, progress/overview views, and scheduling tests.

### Persistence and session isolation

- **SSOT:** each domain owns its parser, normalization, storage key, load/save/clear operations, and schema migration: game, trip profile, lifecycle, guided rehearsal, and Pocket Deck.
- **Session authority:** `app/persistence/session.ts` owns owner-versus-demo storage selection and demo namespacing. `app/persistence/reset.ts` coordinates the five domain-owned clear operations.
- **Why:** domain parsers fail closed while session generation prevents stale owner/demo writes.
- **Known callers:** `PrototypeApp`, reset UI, Admin demo operations, browser acceptance, and persistence tests.

### Admin review

- **SSOT:** `app/admin/demo-conductor.ts` owns demo progress; `app/admin/canonical-demo.ts` executes registered canonical paths; `app/admin/fast-track.ts` derives its checkpoint list from the manifest.
- **Why:** Admin does not implement separate episode rules. Unsupported checkpoint identifiers throw rather than selecting Day 0 silently.
- **Known callers:** `PrototypeApp`, Admin views, demo-session tests, and Admin/checkpoint browser acceptance.

### Pocket Deck

- **SSOT:** `app/pocket-deck/catalog.ts` owns the core cards; `model.ts` owns state normalization and mutations; `persistence.ts` owns the saved domain. Season and guided handoff modules create bounded evidence, which the model applies idempotently.
- **Known callers:** Trip Mode rendering, rehearsal review, offline/audio generation, and Pocket Deck tests.

### Offline behavior

- **SSOT:** `build/offline-assets.ts` owns asset selection, cache versioning, manifest construction, and service-worker source. `scripts/build-offline.ts` is the prepare/verify command entry. `app/offline/useOfflineReadiness.ts` is the browser readiness coordinator.
- **Known callers:** production build, offline acceptance, the application shell, and offline tests.

### Client failures

- **SSOT:** `app/observability/client-failures.ts` owns bounded client failure codes, counts, redaction, and subscriptions.
- **Known callers:** persistence domains, offline/audio/render handling, the player-facing warning banner, and failure tests.

## Removed unsupported paths

- Removed the impossible season `planned` status, mapped-authoring fallback, placeholder scene/context construction, and `IMPLEMENTED_EPISODES` alias. Missing current metadata now throws during module initialization.
- Removed the four-anchor `seedLegacyAnchorState` route and its historical outcome test. Current Admin seeds come only from registered episode definitions.
- Removed the legacy `terminalBehavior` marker; `completionOutcomeIds` is the only season-completion policy.
- Removed test-only Admin next/inference helpers and the unused fresh-demo wrapper.
- Removed registry catalog re-exports from `app/game/model.ts`; callers import the registry directly.
- Removed inactive D1, R2, placeholder-database, optional Drizzle packaging, and empty Next-config paths. The current build packages required Sites metadata and fails if it is missing.
- Narrowed internal coordinator, namespacing, scheduling, and view helpers so they do not present alternate public entry points.

## Retained compatibility with current data

- Game save migrations for schemas v1–v5 remain because an owner browser can still contain those persisted records.
- Pending-terminal hydration remains because an older save may have been written between response evaluation and media completion. Current submission finalizes immediately, while hydration finalizes the historical pending outcome exactly once.
- Existing local-storage keys remain stable to preserve the owner’s device-local data. Renaming them would be a data migration, not dead-code cleanup.
- Malformed-data recovery remains fail-closed. It is validation at a persistence boundary, not an alternate product mode.

## Guardrails

Run `npm run test:ssot` after architecture, season, build-config, Admin, or persistence changes. Its static assertions prevent removed flags, legacy symbols, registry facades, and inactive hosting adapters from returning. The full `npm test` remains the behavioral authority.
