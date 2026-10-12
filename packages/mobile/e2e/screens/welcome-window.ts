import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class WelcomeWindow extends Screen {
  constructor(page: Page) {
    super(page, 'welcome-window');
  }

  get quickGame() {
    return this.page.getByTestId('welcome-quick-game');
  }

  get playOnline() {
    return this.page.getByTestId('welcome-play-online');
  }

  get classicPlaque() {
    return this.text(/Played Pidro Classic/i);
  }
}
