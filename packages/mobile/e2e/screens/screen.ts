import type { Locator, Page } from '@playwright/test';

/**
 * One screen, found by its testID. Expo Router on web keeps earlier screens
 * mounted under the current one, so every locator starts from the top one.
 */
export class Screen {
  readonly root: Locator;

  constructor(
    readonly page: Page,
    testId: string
  ) {
    this.root = page.getByTestId(testId).last();
  }

  field(label: string) {
    return this.root.getByLabel(label, { exact: true });
  }

  button(name: string) {
    return this.root.getByRole('button', { name, exact: true });
  }

  text(text: string | RegExp) {
    return this.root.getByText(text).first();
  }

  /** The error or notice the screen is showing. */
  get alert() {
    return this.root.getByRole('alert').first();
  }

  async innerText() {
    return (await this.root.innerText()).replace(/\s+/g, ' ').trim();
  }
}
