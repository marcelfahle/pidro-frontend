import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class AgeStopScreen extends Screen {
  constructor(page: Page) {
    super(page, 'age-stop-screen');
  }
}
