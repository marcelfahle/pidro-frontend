import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class ClaimClassicScreen extends Screen {
  constructor(page: Page) {
    super(page, 'claim-classic-screen');
  }

  get found() {
    return this.text('Classic account found');
  }

  async verify(login: string, password: string) {
    await this.text('How did you use Classic?').waitFor();
    if (!(await this.field('Classic username or email').isVisible())) {
      await this.button('Classic username & password').click();
    }
    await this.field('Classic username or email').fill(login);
    await this.field('Classic password').fill(password);
    const answered = this.page.waitForResponse((response) =>
      response.url().includes('/api/v1/classic/verify')
    );
    await this.button('Verify Classic account').click();
    await answered;
  }

  /** The "create your account" form a claim with nobody signed in asks for. */
  async createAccountAndClaim(account: { username: string; email: string; password: string }) {
    await this.field('Username').fill(account.username);
    await this.field('Email').fill(account.email);
    await this.field('New Pidro password').fill(account.password);
    await this.button('Create account and claim').click();
  }
}
