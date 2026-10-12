import type { Page } from '@playwright/test';
import { Screen } from './screen';

/** Create account runs in three steps: email, password, public name. */
export class RegisterScreen extends Screen {
  constructor(page: Page) {
    super(page, 'register-screen');
  }

  async enterEmail(email: string) {
    await this.field('Email').fill(email);
    await this.button('Continue').click();
  }

  async enterPassword(password: string) {
    await this.field('Password').fill(password);
    await this.button('Create account').click();
  }

  async enterName(name: string) {
    await this.field('Public name').fill(name);
    await this.button('CONTINUE').click();
  }

  async createAccount(player: { email: string; password: string; name: string }) {
    await this.enterEmail(player.email);
    await this.enterPassword(player.password);
    await this.enterName(player.name);
  }

  get signInInstead() {
    return this.text('Sign in instead');
  }
}
