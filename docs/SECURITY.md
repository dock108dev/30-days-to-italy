# Security model and hardening record

Application paths in this document are relative to `web/`. Run validation commands from that directory.

This document describes the current repository security boundary. It does not certify the live deployment configuration. The application remains an owner-only vacation-rehearsal PWA and is not approved for public or shared access.

## Live verification — 2026-08-23

Read-only Sites inspection confirmed that the existing production site is active with custom access, one owner account, zero workspace or tenant groups, and zero external visitors. Signed-out navigation stops at the ChatGPT authentication gate.

Production remains saved version 1 and does not yet match this repository candidate. An authenticated response returned `200` with `Cache-Control: no-store, must-revalidate`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and disabled microphone/camera/geolocation permissions. CSP, HSTS, COOP, CORP, and `X-Robots-Tag` were absent; `POST /` correctly returned `405` with `Allow: GET, HEAD`, while `/_vinext/image` returned the older `400` behavior rather than the candidate's `404`.

This is verification evidence, not deployment approval. The repository hardening becomes live only after the cumulative candidate is committed, frozen, fully validated, saved as a new Sites version, privately deployed, and rechecked.

## Security understanding

### Surfaces and trust boundaries

- **Browser application:** React/Next-compatible client code accepts a trip profile and typed rehearsal responses. React renders those values as text. There is no raw HTML or markdown renderer, dynamic evaluation, outbound application fetch, runtime model/provider, analytics, or third-party script.
- **Device-local state:** trip details, rehearsal progress, lifecycle mode, guided practice, Pocket Deck activity, and isolated demo data are stored in separate `localStorage` namespaces. These records are personal but are not credentials, payment data, passport data, authentication tokens, or server authorization state.
- **Worker/hosting boundary:** the Cloudflare/Vinext worker serves the application and static files. It accepts only `GET` and `HEAD`, rejects the unused image-transform route, applies security headers, and exposes no application API, database, upload, webhook, server action, queue, scheduler, or callback.
- **Offline boundary:** the same-origin service worker caches a fixed build-generated inventory. It ignores non-GET and cross-origin requests and never reads or writes traveler state. Worker status returns stable reason codes rather than exception text.
- **Admin surface:** Admin and Demo controls are client-side owner-review tools. They can alter only the current browser's local state and cannot access another user or a server record. They are not an authorization system.
- **Authentication/authorization:** no authentication code, cookies, sessions, roles, or account database exist in this repository. Owner-only access is an external Sites deployment policy and must be verified separately before every owner run or release.
- **Build-time boundary:** local scripts generate bundled audio/offline artifacts and run isolated browser acceptance. They do not run in the deployed browser. Environment files, Wrangler state, build output, PEM files, and dependencies are git-ignored.

## Confirmed vulnerabilities

No critical, high, or medium confirmed vulnerability was found in the current repository. The fixes below are evidence-backed hardening of reachable surfaces; their severity reflects the owner-only, device-local architecture.

## Fixed hardening opportunities

### SEC-001 — Browser policy was incomplete

- **Category:** XSS containment, clickjacking, browser permissions, caching
- **Affected area:** `worker/index.ts`
- **Severity / confidence:** low / high
- **Why it matters:** the existing worker denied framing and several permissions but had no CSP, HSTS, cross-origin opener/resource policy, or HTTP no-store rule for the document. A future rendering defect or compromised dependency would have had fewer containment layers.
- **Realistic scenario:** injected code in a future dependency attempts an outbound connection or embedded object, or a shared proxy caches the generic owner-only HTML shell.
- **Evidence:** the prior header list contained only `nosniff`, no-referrer, three disabled permissions, and `DENY` framing.
- **Fix:** added a same-origin CSP, disabled objects/frames/base replacement/script attributes, restricted connections/media/fonts/workers/forms, expanded Permissions Policy, added HSTS, COOP, CORP, `X-Robots-Tag`, and `private, no-store` for `/`.
- **Status:** fixed

The production framework currently requires inline bootstrap scripts and styles, so CSP retains `'unsafe-inline'` for `script-src` and `style-src`. All external script and connection origins remain blocked.

### SEC-002 — Unused image transformation remained reachable

- **Category:** attack-surface and resource-abuse reduction
- **Affected area:** `/_vinext/image` in `worker/index.ts`
- **Severity / confidence:** low / high
- **Why it matters:** image decoding and transformation is parser- and CPU-intensive. The application has no `next/image` consumer, so retaining the endpoint provided risk without product value.
- **Realistic scenario:** an authorized or accidentally exposed caller repeatedly requests transforms to consume worker resources. No SSRF claim is made because the removed implementation used the static asset binding.
- **Evidence:** repository search found the optimizer only in the worker implementation and no application consumer.
- **Fix:** removed optimizer imports/bindings and return a secured, non-cacheable `404` for the route.
- **Status:** fixed

### SEC-003 — Unnecessary HTTP methods reached the framework handler

- **Category:** API/input surface reduction
- **Affected area:** worker request entry point
- **Severity / confidence:** low / high
- **Why it matters:** the product has no mutation API or form endpoint, so accepting other methods creates ambiguous behavior and avoidable framework parsing.
- **Realistic scenario:** automated probes submit unsupported methods and payloads to exercise framework paths the product never uses.
- **Evidence:** the prior worker forwarded every method to the framework handler.
- **Fix:** only `GET` and `HEAD` are accepted; other methods receive a secured, non-cacheable `405` with `Allow: GET, HEAD`.
- **Status:** fixed

### SEC-004 — Typed responses were not bounded at the authoritative boundary

- **Category:** input validation and local resource exhaustion
- **Affected area:** response composer and generic episode coordinator
- **Severity / confidence:** low / high
- **Why it matters:** a very large pasted or programmatic response could increase normalization, render, and local-storage work even though it could not affect another user or server.
- **Realistic scenario:** a browser automation script bypasses the UI and submits megabytes of text, making that tab or local save unstable.
- **Evidence:** the textarea had no `maxLength`, and the coordinator trimmed but did not cap input before retaining it.
- **Fix:** one shared 500-character limit is enforced in both the UI and coordinator before evaluation, history, or persistence.
- **Status:** fixed

### SEC-005 — Service-worker failure text could expose internal detail

- **Category:** error information exposure
- **Affected area:** generated offline worker status
- **Severity / confidence:** low / high
- **Why it matters:** raw exception messages are unnecessary in the player UI and can expose internal resource names or browser implementation detail.
- **Realistic scenario:** a cache failure message is copied into an evidence record with more detail than operators need.
- **Evidence:** worker status previously returned `error.message` as `reason`.
- **Fix:** only `CACHE_STORAGE_UNAVAILABLE` or `OFFLINE_REPAIR_FAILED` can cross the worker-to-client boundary; the UI displays bounded recovery guidance.
- **Status:** fixed

### SEC-006 — Request-derived metadata origin needed containment

- **Category:** host-header/metadata integrity
- **Affected area:** social metadata origin and root response caching
- **Severity / confidence:** low / high
- **Why it matters:** syntactically unsafe forwarded hosts could influence absolute social-image metadata.
- **Realistic scenario:** a misconfigured proxy forwards an attacker-controlled host and a shared cache retains the resulting metadata.
- **Evidence:** metadata is request-origin derived.
- **Fix:** unsafe host syntax is rejected, fallback is deterministic, the failure is privacy-safe and observable, and the root document is non-cacheable. The host remains proxy-derived because local and deployed origins legitimately differ.
- **Status:** fixed

## Accepted and deferred findings

### SEC-101 — Admin is a client-only owner tool

- **Category:** authorization / privileged workflow
- **Severity / confidence:** medium if access is widened; informational under the current owner-only policy / high
- **Scenario:** a future shared user can open Admin and replace only their own browser journey with canonical demo state.
- **Current rationale:** there is no shared server data or cross-user authority, and owner review requires the tool.
- **Status:** accepted for owner-only use; **needs decision** before any shared/public access.
- **Required broader fix:** remove Admin from the public build or add server-enforced authenticated roles and a separate non-production review deployment. A client flag is not sufficient authorization.

### SEC-102 — Personal state is readable to same-origin code and local device users

- **Category:** privacy and storage
- **Severity / confidence:** medium for a shared device or XSS; low in the current single-owner profile / high
- **Scenario:** another person with the same unlocked browser profile, or successful same-origin script injection, reads trip details and responses from `localStorage`.
- **Current rationale:** the product deliberately has no account, remote database, sensitive-document fields, or sync. CSP and zero outbound runtime connections reduce exfiltration paths but do not make localStorage confidential.
- **Status:** accepted for the current private-device beta; **needs architecture decision** for multi-user or regulated data.

### SEC-103 — CSP still permits inline framework bootstrap

- **Category:** XSS defense in depth
- **Severity / confidence:** low / high
- **Scenario:** a future raw-HTML sink could combine with inline-script allowance.
- **Current rationale:** Vinext/React production output uses inline bootstrap scripts/styles, and removing the allowance without nonce/hash integration breaks hydration.
- **Status:** deferred.
- **Required broader fix:** introduce per-response nonces or deterministic hashes through the framework/edge boundary, then validate install, hydration, offline replay, and updates without `'unsafe-inline'` in `script-src`.

### SEC-104 — Security monitoring is local only

- **Category:** audit and incident response
- **Severity / confidence:** informational / high
- **Current rationale:** remote analytics and telemetry are intentionally excluded for privacy. Structured operational failures remain in the affected browser only.
- **Status:** accepted. If access expands, choose a privacy-reviewed, redacted security-event channel before implementation.

## Manual verification outside the repository

Before any owner run or deployment, verify against the exact frozen candidate:

1. Sites access is still custom owner-only with the intended owner and zero groups/external visitors.
2. Signed-out access stops at the hosting authentication gate; do not use or request owner credentials for engineering verification.
3. The deployed response preserves CSP, HSTS, COOP, CORP, no-store, noindex, frame, referrer, content-type, and permissions headers.
4. The deployed `/_vinext/image` returns `404`, unsupported methods return `405`, and ordinary app/static/offline requests still work.
5. No public/share setting, account, analytics, database, object storage, microphone, or provider integration was introduced outside this repository.

## Prioritized roadmap

1. **Required before owner use:** review and commit the cumulative diff, freeze a new candidate, rerun all engineering gates, and verify live owner-only hosting and headers.
2. **Required before shared access:** remove Admin from that build or implement server-side authentication and authorization; define privacy, deletion, abuse, and rate-limit policy.
3. **Defense in depth:** replace inline-script CSP allowance with framework-supported nonces/hashes.

Supply-chain checks are now configured in `.github/workflows/ci.yml`: locked installation, lint, TypeScript, full build/tests, browser acceptance, a high-severity production audit, and a full-history secret scan. Repository settings and GitHub-managed CodeQL remain external controls and must be inspected separately.

## Validation commands

```bash
npm run lint
npx tsc --noEmit
npm run test:security
npm run test:response-contracts
npm test
npm run test:interaction
npm run test:admin-demo
npm run test:checkpoint-hardening
npm run test:offline
npm audit --omit=dev --audit-level=high
git diff --check
```
