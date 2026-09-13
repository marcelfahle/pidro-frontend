import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, devices } from 'playwright';

const base = process.env.MOBILE_BASE_URL ?? 'http://localhost:8082';
const shots = resolve(process.env.UI_SHOT_DIR ?? '../../.amp/in/artifacts');
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, profile, safeArea] of [
    ['iphone-size', devices['iPhone 13'], 'island'],
    ['pixel-size', devices['Pixel 7'], 'android-gesture'],
    ['tablet', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 }, ''],
    ['landscape', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }, ''],
  ]) {
    const context = await browser.newContext({ ...profile, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.dealerStates = [];
      new MutationObserver(() => {
        for (const node of document.querySelectorAll('[data-testid^="dealer-selection-"]')) {
          const id = node.getAttribute('data-testid');
          if (!window.dealerStates.includes(id)) window.dealerStates.push(id);
        }
      }).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-testid'],
      });
    });
    await page.clock.install();
    const open = (scenario) =>
      page.goto(`${base}/table-dev?selection=${scenario}&safeArea=${safeArea}`);
    await open('live');
    const active = page.getByTestId('dealer-selection-active');
    await active.waitFor();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    assert.equal(await active.getAttribute('aria-live'), 'polite');
    assert.match(await active.getAttribute('aria-label'), /Choosing the dealer/);
    await page.getByTestId('rendered-cut-card-count-4').waitFor();
    const labelBox = await active.boundingBox();
    const northBox = await page.getByTestId('seat-north').boundingBox();
    assert(labelBox.y >= 0 && labelBox.y + labelBox.height <= profile.viewport.height);
    assert(
      labelBox.y >= northBox.y + northBox.height ||
        labelBox.x + labelBox.width <= northBox.x ||
        labelBox.x >= northBox.x + northBox.width,
      'title overlaps north seat'
    );
    assert.match(await page.getByTestId('seat-north').getAttribute('aria-label'), /Drew 9♣/);
    assert(!(await page.getByText('Bot playing', { exact: true }).count()));
    await page.screenshot({ path: `${shots}/pid91-${name}-active.png` });
    await page.clock.runFor(1300);
    await page.getByTestId('dealer-selection-result').waitFor();
    assert.match(
      await page.getByTestId('dealer-selection-result').getAttribute('aria-label'),
      /Eli is the dealer/
    );
    assert.match(await page.getByTestId('seat-east').getAttribute('aria-label'), /Dealer/);
    await page.screenshot({ path: `${shots}/pid91-${name}-selected.png` });
    await page.clock.runFor(3000);
    await page.getByTestId('bidding-window').waitFor();
    await page.getByTestId('rendered-cut-card-count-0').waitFor();
    assert.equal(await page.locator('[data-testid^="dealer-selection-"]').count(), 0);
    console.log(
      `${name}: active → selected → bidding; 4 → 0 cuts; aria-live, bot action, dealer name, no north overlap; coarse=${await page.evaluate(() => matchMedia('(pointer: coarse)').matches)}`
    );
    if (name === 'iphone-size') {
      for (const scenario of ['network', 'delayed', 'selected', 'near', 'bidding', 'stale']) {
        await page.clock.resume();
        await open(scenario);
        if (scenario === 'network' || scenario === 'stale')
          await page.getByTestId('dealer-selection-active').waitFor();
        if (scenario === 'delayed' || scenario === 'selected') {
          await page.getByTestId('dealer-selection-result').waitFor();
          await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
          assert.equal(await page.getByTestId('dealer-selection-active').count(), 0);
          await page.getByTestId('rendered-cut-card-count-4').waitFor();
          await page.clock.runFor(100);
          await page.screenshot({ path: `${shots}/pid91-${scenario}-catchup.png` });
          await page.clock.runFor(3000);
        }
        await page.getByTestId('bidding-window').waitFor();
        await page.getByTestId('rendered-cut-card-count-0').waitFor();
        assert.equal(await page.locator('[data-testid^="dealer-selection-"]').count(), 0);
        if (['delayed', 'selected', 'near', 'bidding'].includes(scenario)) {
          assert(
            !(await page.evaluate(() => window.dealerStates)).includes('dealer-selection-active')
          );
        }
        console.log(`${scenario}: authoritative bidding, no selection replay`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
