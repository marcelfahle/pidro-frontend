import type { Page } from '@playwright/test';

/** The old web client's page that a reset email links to. */
export class WebResetPage {
  constructor(readonly page: Page) {}

  get newPassword() {
    return this.page.getByLabel('New password', { exact: true });
  }

  get error() {
    return this.page.getByText('Reset link is invalid or expired');
  }

  async setNewPassword(password: string) {
    await this.newPassword.fill(password);
    await this.page.getByLabel('Confirm new password').fill(password);
    await this.page.getByRole('button', { name: 'Set New Password' }).click();
  }
}
