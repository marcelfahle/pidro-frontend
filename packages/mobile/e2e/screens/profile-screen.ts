import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class ProfileScreen extends Screen {
  constructor(page: Page) {
    super(page, 'profile-screen');
  }

  stat(label: string) {
    return this.classicSection.getByLabel(`${label}: `);
  }

  /**
   * The Classic card arrives with the profile's own request and pushes the account buttons
   * down; a tap before it lands where a button was.
   */
  private loaded() {
    return this.classicSection.or(this.button('Claim Pidro Classic')).waitFor();
  }

  /** Opens the save sheet from the profile. */
  async saveYourProgress() {
    await this.loaded();
    await this.button('Save your progress').click();
  }

  get classicSection() {
    return this.root.getByTestId('profile-classic-section');
  }

  /** Taps Sign out and, on the "Sign out?" window, confirms. */
  async signOut() {
    await this.askToSignOut();
    await this.page.getByText('Sign out?').waitFor();
    await this.page.getByRole('button', { name: 'Sign out', exact: true }).last().click();
  }

  /** Taps Delete account and, on the "Delete your account?" window, confirms. */
  async deleteAccount() {
    await this.loaded();
    await this.button('Delete account').first().click();
    await this.page.getByText('Delete your account?').waitFor();
    await this.page.getByRole('button', { name: 'Delete account', exact: true }).last().click();
  }

  async askToSignOut() {
    await this.loaded();
    await this.button('Sign out').first().click();
  }

  // A guest who signs out is first offered saving the account.
  get savePrompt() {
    return this.page.getByText('Save this guest before signing out?');
  }

  get saveAccount() {
    return this.page.getByRole('button', { name: 'Save account', exact: true });
  }
}
