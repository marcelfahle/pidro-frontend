import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DesignSystemPage } from './DesignSystemPage';

describe('DesignSystemPage', () => {
  // The workbench renders every DS component at once — give it headroom
  // when the suite runs all files in parallel.
  it('renders the design system workbench sections', { timeout: 20_000 }, () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Pidro Design System')).toBeInTheDocument();
    expect(screen.getByText('Buttons')).toBeInTheDocument();
    expect(screen.getByText('Avatars, Skill & Dedication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Multiplayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Glass lg' })).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });
});
