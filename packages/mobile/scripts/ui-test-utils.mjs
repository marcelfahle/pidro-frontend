export const UI_VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'compact-landscape', width: 667, height: 375, tableOnly: true },
];

export function assertInsideViewport(name, box, viewport) {
  const tolerance = 1;
  if (
    box.x < -tolerance ||
    box.y < -tolerance ||
    box.x + box.width > viewport.width + tolerance ||
    box.y + box.height > viewport.height + tolerance
  ) {
    throw new Error(
      `${name} is outside ${viewport.name}: ${JSON.stringify(box)} vs ${viewport.width}x${viewport.height}`
    );
  }
}

// Expo's dev-mode error toast (e.g. a failed lobby fetch when no backend is
// running, as in CI) renders real <button> elements that the touch-target and
// geometry assertions would otherwise flag — Playwright role queries pierce
// its shadow root. It is tooling, not app UI: hide its #error-toast host
// (display:none on the host hides the whole shadow tree, including toasts
// that arrive later).
export async function suppressDevOverlays(page) {
  await page.addStyleTag({
    content: '#error-toast { display: none !important; }',
  });
}

export async function getStableBox(locator, page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const box = await locator.boundingBox();
    if (box) return box;
    await page.waitForTimeout(150);
  }
  return null;
}

export async function assertMinimumTouchTargets(
  page,
  screenName,
  viewport,
  { checkInputs = false } = {}
) {
  for (const role of ['button', 'link', 'switch']) {
    const controls = await page.getByRole(role).all();
    for (let index = 0; index < controls.length; index += 1) {
      if (!(await controls[index].isVisible())) continue;
      const box = await controls[index].boundingBox();
      if (!box || (box.width >= 44 && box.height >= 44)) continue;
      const label =
        (await controls[index].getAttribute('aria-label')) ??
        (await controls[index].textContent())?.trim();
      throw new Error(
        `${screenName} has a sub-44pt ${role} in ${viewport.name}: ${label || index} ${JSON.stringify(box)}`
      );
    }
  }

  if (!checkInputs) return;

  const inputs = await page.locator('input:not([type="checkbox"])').all();
  for (let index = 0; index < inputs.length; index += 1) {
    if (!(await inputs[index].isVisible())) continue;
    const box = await inputs[index].boundingBox();
    if (box && box.height < 44) {
      throw new Error(
        `${screenName} has a sub-44pt input in ${viewport.name}: ${JSON.stringify(box)}`
      );
    }
  }
}
