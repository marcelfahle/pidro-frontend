import type { Page } from '@playwright/test';
import { Screen } from './screen';

export class ClassicHelpScreen extends Screen {
  constructor(page: Page) {
    super(page, 'classic-help-screen');
  }

  get name() {
    return this.field('Name you played as');
  }

  get email() {
    return this.field('Email to reach you');
  }
}
