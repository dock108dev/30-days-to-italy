# Error handling and operations

This document is the source of truth for production-path failure behavior in the owner-only web app. The app has no remote analytics, telemetry provider, account, or server-side traveler-state store. Operational visibility is therefore local to the affected browser and the hosting platform's ordinary request logs.

## Player-visible behavior

- Rehearsal, trip-profile, lifecycle, guided-practice, Pocket Deck, and isolated-demo storage failures produce a persistent in-app alert. The alert includes a stable error code, domain, operation, and repeat count. A dismissed alert appears again if the failure repeats.
- Storage exceptions never include saved values, typed responses, trip details, or exception messages in diagnostic output. Diagnostics contain only the error code, domain, operation, severity, occurrence, timestamp, and exception type.
- A failed save leaves the current in-memory screen usable but explicitly warns that the latest change may disappear after reload. Trip-profile creation and Prepare/Trip switching do not claim success when their immediate save fails.
- Malformed JSON recovers to the domain's safe default without overwriting the malformed record during hydration. Valid legacy game saves and bounded malformed fields continue through the existing migration and normalization rules.
- A full reset attempts every independent local domain. It is reported as successful only when every removal succeeds; a partial reset leaves the current screen in place and tells the owner to reload before starting another journey.
- Rehearsal or Pocket Deck audio failure reveals or retains the Italian text and records a warning. Audio failure never blocks a typed response or card use.
- Offline preparation and repair failure changes the Trip Mode badge to **Offline files unavailable** and records an error. A service-worker update-check failure is a warning: the currently activated worker is still verified before it is treated as ready.
- An unexpected route-render failure shows a bounded recovery screen with **Try again** and a stable `UNEXPECTED_UI_FAILURE` reference.

## Local diagnostics

Open the browser console and filter for `[30-days-to-italy]`. Each record is structured and safe to copy into an incident note. Repeated identical failures have an increasing `occurrence` value, so recurrence is distinguishable from a single event.

The main codes are:

| Code | Meaning | Immediate action |
| --- | --- | --- |
| `PERSISTENCE_DATA_INVALID` | A saved JSON record could not be parsed. | Do not reset or overwrite site data. Record the domain and preserve the browser profile for engineering review. |
| `PERSISTENCE_READ_FAILED` | Browser storage denied or failed a read. | Keep the tab open; check private-browsing, quota, and site-storage policy. |
| `PERSISTENCE_WRITE_FAILED` | A state change could not be persisted. | Stop making important progress, keep the tab open, and resolve storage availability. |
| `PERSISTENCE_CLEAR_FAILED` | Reset or demo cleanup was incomplete. | Reload before beginning another journey or demo. Do not report restoration as complete. |
| `OFFLINE_PREPARATION_FAILED` | The required offline inventory could not be verified or repaired. | Reconnect and retry. Do not rely on disconnected use until **Ready offline** appears. |
| `OFFLINE_UPDATE_FAILED` | A newer worker could not be checked while the current verified worker remains usable. | Continue only on the current version; retry the connected update later. |
| `AUDIO_PLAYBACK_FAILED` | Local audio was unavailable or rejected by the browser. | Continue with visible text; confirm the bundled file and browser media policy separately. |
| `UNEXPECTED_UI_FAILURE` | React could not render the route. | Record the optional digest, try once, and stop if it repeats. |

## Incident rules

1. Preserve the affected tab and browser profile when progress may not be saved.
2. Record the exact source commit, origin, browser/device, code, domain/operation, occurrence count, and whether reload was attempted.
3. Never copy localStorage values, typed traveler responses, trip details, or complete exception messages into evidence.
4. A storage, reset, demo-restoration, or offline-readiness alert invalidates the affected acceptance run. Fix the cause, freeze a new candidate if source changes, and rerun the relevant engineering gate.
5. Do not label an in-memory continuation as persisted, a partial reset as complete, a degraded cache as ready, or automated traversal as owner acceptance.

## Intentional resilience retained

- Browser storage remains device-local and optional at the platform level; the UI stays open after write failure so unsaved work is not immediately destroyed.
- Strict hydration repairs bounded individual fields and migrates supported schema versions. Only unreadable JSON or storage access failure raises an operational alert.
- Audio falls back to authored text because audio is supportive, not authoritative state.
- An activated, verified offline cache remains usable when only the connected update check fails.
- Security headers are copied into a new `Response` when the platform exposes immutable response headers. The body, status, and existing headers are preserved.
- Isolated demo cleanup continues across independent keys so one removal failure does not prevent attempts to remove the others; any incomplete result is still reported and cannot count as successful restoration.

## Release validation

After any error-handling change, run the gates in [Development](DEVELOPMENT.md), including lint, the full unit/build gate, interaction, Admin demo, checkpoint hardening, and offline acceptance. Browser gates require zero unexpected console warnings/errors. Tests that deliberately inject a failure must assert the expected code and must not place private values in evidence.

## Build and deployment boundary

`npm run build` creates the production Worker/client output, generates and verifies the offline manifest and service worker, and copies the checked-in Sites metadata to `dist/.openai/hosting.json`. There is no repository deploy script, release workflow, database migration, or credential-bearing publishing step. Saving and deploying a Sites version is an external hosting operation and must remain separate from pull-request CI.

For an owner release:

1. Freeze an exact source revision and require the validation gates in [Development](DEVELOPMENT.md) to pass against that revision.
2. Build from the frozen revision. Do not substitute an older `dist/` directory; build output is intentionally ignored.
3. Save and privately deploy a new Sites version through the authorized hosting surface. Do not change `.openai/hosting.json`, access policy, or hosted resources as part of an unrelated code change.
4. Perform the external access and response checks in [Security](SECURITY.md#manual-verification-outside-the-repository). A local build cannot prove hosted access control or edge-header behavior.
5. Record the exact source revision, Sites version, access result, and header result. Automated browser traversal is engineering evidence, not owner acceptance.

Public or shared deployment is intentionally unsupported. The repository has no server-side authentication or authorization, and Admin is not a security boundary.
