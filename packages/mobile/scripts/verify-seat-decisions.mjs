import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { assertInsideViewport, suppressDevOverlays } from './ui-test-utils.mjs';

// No backend writes: the fixture intentionally fails Open seat after a short delay.
const baseUrl = process.env.MOBILE_BASE_URL ?? 'http://localhost:8081';
const shots = process.env.UI_SHOT_DIR;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 667, height: 375 },
    { width: 820, height: 1180 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/table-dev?lifecycle=permanent_bot&feedback=owner&notice=true`);
    const review = page.getByRole('button', { name: 'Review seats (3)', exact: true });
    await review.waitFor();
    await page.getByRole('button', { name: /Toggle hand scores/ }).waitFor();
    await suppressDevOverlays(page);
    const north = page.locator('[data-testid="seat-north"]');
    const before = await north.boundingBox();
    await review.click();
    const card = page.getByTestId('seat-decision-card');
    await card.waitFor();
    const cardBox = await card.boundingBox();
    assertInsideViewport('Decision card', cardBox, viewport);
    assert.ok(
      cardBox.x >= 24 && cardBox.x + cardBox.width <= viewport.width - 24,
      'Decision card must have at least 24pt of horizontal breathing room'
    );
    assert.equal(await card.count(), 1);
    assert.match(await card.textContent(), /Nora leftnorth seat/);
    const later = page.getByRole('button', { name: 'Review seats later' });
    const open = page.getByRole('button', { name: 'Open seat for a player' });
    const keep = page.getByRole('button', { name: 'Keep bot', exact: true });
    for (const button of [later, open, keep]) {
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      assertInsideViewport(await button.textContent(), box, viewport);
      assert.ok(box.height >= 44, '44pt touch target');
      await button.click({ trial: true }); // Also checks occlusion, not just DOM presence.
    }
    await later.click();
    await review.waitFor();
    assert.deepEqual(await north.boundingBox(), before, 'Deferring must not move the table');
    await review.click();
    assert.match(await card.textContent(), /Nora left/); // Later did not choose Keep bot.
    if (shots)
      await page.screenshot({ path: resolve(shots, `pid93-${viewport.width}-review.png`) });
    await open.click();
    await page.getByRole('button', { name: 'Updating seat…' }).waitFor();
    assert.equal(await keep.getAttribute('aria-disabled'), 'true');
    await page.getByText('Could not confirm the seat update. Please try again.').waitFor();
    assert.match(await card.textContent(), /3 pending/);
    await keep.scrollIntoViewIfNeeded();
    if (shots) await page.screenshot({ path: resolve(shots, `pid93-${viewport.width}.png`) });
    await keep.click();
    assert.match(await card.textContent(), /2 pending.*Eli left/);
    await later.click();
    await page.getByRole('button', { name: 'Review seats (2)', exact: true }).click();
    await keep.click();
    assert.match(await card.textContent(), /1 pending.*Wynn left/);
    await keep.click();
    assert.equal(await card.count(), 0);
    assert.equal(await page.getByRole('button', { name: /Review seats/ }).count(), 0);
    assert.doesNotMatch(await page.locator('body').textContent(), /Permanent bot|permanent_bot/);
    console.log(
      `PASS ${viewport.width}x${viewport.height}: bounds, hit targets, defer/revisit, loading/error, three-decision queue, stable table`
    );
    await page.close();
  }
} finally {
  await browser.close();
}
