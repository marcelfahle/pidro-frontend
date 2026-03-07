import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DesignSystemPage } from './DesignSystemPage';

describe('DesignSystemPage', () => {
  it('renders the design system workbench sections', () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Pidro Design System')).toBeInTheDocument();
    expect(screen.getByText('Page Headers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gold md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Glass lg' })).toBeInTheDocument();
    expect(screen.getByText('Card Faces')).toBeInTheDocument();
  });
});
