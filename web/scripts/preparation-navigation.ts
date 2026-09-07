import assert from "node:assert/strict";
import type { Page } from "playwright-core";

/** Traverse the ordinary teaching UI; never seed traversal or submit examples. */
export async function traversePreparation(page: Page) {
  await page.locator(".preparation, .audio-stage, .outcome-card").first().waitFor();
  for (let step = 0; step < 5 && await page.locator(".preparation").count(); step++) {
    assert.equal(await page.locator("textarea").count(), 0);
    const forward = page.getByRole("button", { name: /^(Prepare for check-in|Prepare for the key handoff|Build a response|Continue to check-in|Continue to the handoff|Start conversation|Continue conversation)$/ });
    await forward.click();
  }
  assert.equal(await page.locator(".preparation").count(), 0, "ordinary preparation reaches live handoff");
}
