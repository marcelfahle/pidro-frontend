import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

const mockRequestPasswordReset = vi.fn();
vi.mock('../api/auth', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector({ status: 'unauthenticated' }),
  );
});

describe('ForgotPasswordPage', () => {
  it('requests a password reset for a username', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      message: 'If an account exists for that username or email, a reset link has been sent.',
      reset_url: 'http://localhost:5173/reset-password?token=abc',
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('Username or email'), 'mfahle');
    await userEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(mockRequestPasswordReset).toHaveBeenCalledWith('mfahle');
    expect(screen.getByText(/If an account exists/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open local reset link' })).toHaveAttribute(
      'href',
      '/reset-password?token=abc',
    );
  });
});
