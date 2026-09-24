# UI presentation verification

## September 23, 2026 — Starter 02 cleanup

Current review uses fresh production previews, disposable Chromium contexts and synthetic fixtures on isolated loopback origins. The active app is `web/app/page.tsx` → `prototype/PrototypeApp.tsx`; Admin is a separate review tool and `PrepareFocus` is not the current landing view. The starting source was `9176b7f`; the three pre-existing documentation edits were preserved. No retained owner profile, installed/frozen build, commit, push or deployment was changed.

[Matched screenshots and measurements](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/presentation-cleanup-20260923/index.html) · [raw measurements](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/presentation-cleanup-20260923/final/measurements.json).

| Same 390 × 844 state | Before | After |
| --- | --- | --- |
| Setup: top of save button | 1,282px | 655px; fully in first viewport |
| Day 0 result: top of Continue | 1,485px | 557px; fully in first viewport |
| Live Day 0 reply after reading the line | see matched capture | Less repeated heading/control space; response remains beside the transcript |

These are document coordinates at scroll top, not usability percentages. Default setup and continuing from a result add no steps. Changing initial travel preferences takes one disclosure; their selected values remain visible and editing expands them. The lesson sequence and teaching material remain intact, so longer listening pages still scroll. Details, save distinctions, unsuccessful outcomes and recovery remain available.

Checks: lint and TypeScript passed; production build verified 455 offline resources including 426 audio files; 6 rendered and 155 domain tests passed. A broader 193-test domain run and focused 47-test run also passed. Existing assertions were updated only for changed text, review order and opening the diagnostic disclosure. The final interaction campaign passed at 1440 × 900 and 390 × 844, covering keyboard focus, ordinary Day 0–1, later episodes, help, rejected audio, outcomes, duplicate input, saving practice and reloads. Fresh matched screenshots had no console warnings/errors or page overflow. Additional checks cover preferences/validation, date-locked sessions, empty search, pins, large-text view and Escape focus return, 320px/landscape deck layouts, 200% page zoom and enlarged root text. Enlarged text exposed a progress-row overlap; wrapping was repaired and rechecked.

**Limit:** `preparation-acceptance.ts` stopped at line 173 waiting for normal audio to advance after reload, in both current attempts and an isolated unchanged `9176b7f` build. The visible text fallback works; a separate direct-play check succeeds. The complete real-media/reload campaign is not a pass. [Current failure](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/presentation-cleanup-20260923/preparation-attempt-2/preparation-browser/failure.json) · [unchanged baseline failure](/Users/michaelfuscoletti/Desktop/italian-pilot-evidence/presentation-cleanup-20260923/baseline-preparation/preparation-browser/failure.json). Service-worker interception remained enabled. Full offline, all-checkpoint and Admin campaigns were not rerun; cache inventory is not disconnected-use qualification. No physical phone, screen-reader audit, owner learning acceptance or release qualification is claimed.

Separate suggestions, left unimplemented:

| Priority / screen or source | Observation and impact | Boundary and bounded next action |
| --- | --- | --- |
| 1. Trip navigation — `PrototypeApp.tsx: changeMode` | Confirmed in source and a fresh synthetic Day 0 UI: owner-mode Trip opens before Day 30. This contradicts the current beta tracker’s required completion gate. | Eligibility changes are outside presentation scope. Add a separately scoped shared owner/demo gate with before/after/replay coverage. |
| 2. Preparation audio after reload — `scripts/preparation-acceptance.ts:173` | Confirmed test failure on current and unchanged source; direct playback works. Travelers may face a media/reload issue, but root cause and real-device impact remain unverified. | Media and service-worker behavior were not changed here. Reproduce and inspect the media failure on the isolated baseline before proposing a bounded repair. |
| 3. Days 2–30 — `season/episodes` | Confirmed source/tracker gap: explicit pre-response preparation is authored only for Days 0–1. Later sessions can ask for material not yet taught. | Teaching content, targeted review and variations are beta work. Continue the tracker’s B1 content/coverage packet. |

## Historical — September 21, 2026

The following Starter 01 screenshots and results describe the earlier source, not the current interface. Source implementation and engineering review only.

Production build passed, including generated offline-cache verification (455 resources, 426 audio files). Six rendered-output tests and four presentation-contract tests passed. Setup and Prepare screens were inspected at 1440px and 390px using a fresh browser profile. Development preview logged a React development/CSP warning; final review uses the production server. No existing progress was changed.

## Retained review

The shared [review gallery](../../ui-templates/review.html) contains screenshots and browser check results. Browser specimens are local fixtures or isolated startup states. Web review checked representative 1440px/390px layouts, page exceptions, and page-level horizontal overflow; it is not an exhaustive audit of every state, contrast pair, screen reader, browser, installed build, or physical phone.

Template gallery search, form submit feedback, dialog opening, and Escape dismissal were exercised. Shared styles include keyboard focus, reduced-motion, and reduced-transparency handling. Native Godot is a basic translucent fallback, not a true blur material. Native games retain their desktop layout and illustrated artwork.

See [design and future template use](ui-design.md). No owner acceptance or release qualification is inferred. Rebuild/relaunch the appropriate source application to see the change; installed or frozen copies remain their original versions.
