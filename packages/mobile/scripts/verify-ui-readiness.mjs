import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { waitForScreenshotReady } from './ui-test-utils.mjs';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<style>
    @keyframes enter { from { opacity: 0; } to { opacity: 1; } }
    @keyframes breathe { to { transform: scale(1.1); } }
    #modal { animation: enter 200ms 150ms both; }
    #ambient { animation: breathe 1s infinite alternate; }
  </style><div id="modal">Ready</div><div id="ambient">Ambient</div>`);
  await waitForScreenshotReady(page);
  assert.equal(await page.locator('#modal').evaluate((el) => getComputedStyle(el).opacity), '1');
  assert.equal(
    await page.locator('#ambient').evaluate((el) => el.getAnimations()[0].playState),
    'running'
  );

  let delivered = false;
  await page.route('https://fixture.invalid/image.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    delivered = true;
    await route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64'
      ),
    });
  });
  await page.setContent('<img src="https://fixture.invalid/image.png">', {
    waitUntil: 'domcontentloaded',
  });
  await waitForScreenshotReady(page);
  assert.equal(delivered, true);
  assert.equal(
    await page.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0),
    true
  );
  console.log(
    'Screenshot readiness: delayed finite animation and image loading passed; ambient motion remains active.'
  );
} finally {
  await browser.close();
}
