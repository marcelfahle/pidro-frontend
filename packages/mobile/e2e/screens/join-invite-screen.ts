import { expect, type Page } from '@playwright/test';
import { Screen } from './screen';

export class JoinInviteScreen extends Screen {
  constructor(page: Page) {
    super(page, 'join-invite-screen');
  }

  /** Auth handoffs return to the preview; joining still requires consent. */
  async joinTable() {
    await expect(this.root.getByTestId('invite-rule-set')).toBeVisible({ timeout: 30_000 });
    await this.button('Join table').click();
  }
}
