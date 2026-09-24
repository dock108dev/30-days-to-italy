# 30 Days to Italy UI design

Updated September 23, 2026. Shared Glass UI Starter 02; presentation-only adoption.

## For future contributors

Start with [local design requirements](ui-design-requirements.md), then review the shared [UI Templates gallery](../../ui-templates/index.html) and [template guide](../../ui-templates/README.md). The source folder on the owner's Mac is `/Users/michaelfuscoletti/Desktop/ui-templates`. It contains dashboard, list/table, form/setup, settings, detail, state/dialog, and native Godot starters.

Use light cool glass, slate text, blue actions, restrained depth, rounded controls, and system typography as the default. Do not reintroduce the generic beige/green/yellow template. Preserve explicit semantic success, caution, error, unavailable, and unknown states. Readability and the task's layout outrank decoration.

The shared folder is a design reference, not a runtime dependency. Project assets are checked in locally and can run without the Desktop folder. If you receive this repository alone, this local requirements copy and the implementation describe the baseline. Request the source template folder when you need the full gallery. Template revisions are adopted deliberately, never silently synchronized.

## This project's adaptation

Prepare/Trip chrome, forms, progress, cards, and dialogs share the glass foundation. Existing illustrations retain their art. Teaching, audio, calendar gates, Pocket Deck eligibility, and stored progress are unchanged.

Starter 02 adapts the shared setup, detail and feedback examples: compact navigation and session progress; one full-width preparation reading area; the result and next action together; one useful phrase instead of repeated feedback; and plain Pocket Deck/help wording. Setup keeps dates, duration and region visible, summarizes selected preferences, and reveals their controls together. Editing opens those controls; invalid transport selection reveals them again. Warnings keep the problem/recovery visible and put codes in “Technical details.” Required lesson pages, Italian teaching content, outcomes, save formats and eligibility logic are unchanged.

Implementation: `web/app/glass.css` and the existing trip, rehearsal, guided-review, Pocket Deck and warning views. No runtime dependency on the shared template folder.

## Review and status

See [UI adoption verification](ui-verification.md). Source changes and technical/visual checks do not establish owner acceptance, a new release, live-data qualification, or acceptance of an older frozen candidate. Existing project-specific gates remain separate.
