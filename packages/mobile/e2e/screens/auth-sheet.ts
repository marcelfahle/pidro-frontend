import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class AuthSheet extends Screen {
  constructor(page: Page) {
    super(page, 'auth-sheet');
  }

  // The sheet wipes its fields when its slide-in ends (PID-179), so wait for it to settle first.
  async settle() {
    await this.page.waitForTimeout(1200);
  }

  async save(email: string, password: string, name?: string) {
    if (name) await this.field('Public name').fill(name);
    await this.field('Email').fill(email);
    await this.field('Password').fill(password);
    await this.button('Save account').click();
  }
}
