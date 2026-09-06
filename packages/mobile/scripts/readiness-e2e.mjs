/** Confirm one initial full roster through the real UI, never a synthetic socket. */
export async function confirmInitialTable(
  pages,
  activeSelector,
  { onWaiting = async () => {}, waitForStart = true } = {}
) {
  const ready = (page) => page.getByRole('button', { name: "I'm ready", exact: true });
  const active = (page) => page.locator(activeSelector).first();
  // An old backend starts immediately. Do not mistake a slow-loading page for it.
  await ready(pages[0]).or(active(pages[0])).first().waitFor({ timeout: 30_000 });
  if (await active(pages[0]).isVisible()) return false;

  for (const page of pages) await ready(page).waitFor({ timeout: 30_000 });
  await onWaiting();
  for (let index = 0; index < pages.length; index += 1) {
    // Deliberately stagger confirmations: loading/decision delays must not start a game.
    await pages[index].waitForTimeout(1_500);
    for (const page of pages) {
      if (await active(page).isVisible()) {
        throw new Error('Game started before every human confirmed readiness');
      }
    }
    for (const page of pages.slice(0, index)) {
      if ((await ready(page).isVisible()) && (await ready(page).isEnabled())) {
        throw new Error('Readiness reset after confirmation; refusing to confirm a new roster');
      }
    }
    await ready(pages[index]).click({ timeout: 10_000 });
    // Do not retry stale errors or automatically confirm subsequent epochs.
    await pages[index]
      .waitForFunction(
        () => {
          const button = [...document.querySelectorAll('button, [role="button"]')].find(
            (element) =>
              (element.getAttribute('aria-label') ?? element.textContent)?.trim() === "I'm ready"
          );
          return !button || button.disabled || button.getAttribute('aria-disabled') === 'true';
        },
        null,
        { timeout: 10_000 }
      )
      .catch((error) => {
        throw new Error('Ready was not acknowledged (or roster reset); no automatic retry', {
          cause: error,
        });
      });
  }
  if (waitForStart) {
    await Promise.all(pages.map((page) => active(page).waitFor({ timeout: 30_000 }))).catch(
      (error) => {
        throw new Error('Initial readiness did not start the game; check for roster/epoch reset', {
          cause: error,
        });
      }
    );
  }
  return true;
}
