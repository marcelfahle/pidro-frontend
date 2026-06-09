import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordPage } from './ResetPasswordPage';

const mockSetSession = vi.fn();
const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

const mockResetPassword = vi.fn();
vi.mock('../api/auth', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password?token=abc']}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector({ status: 'unauthenticated', setSession: mockSetSession }),
  );
});

describe('ResetPasswordPage', () => {
  it('sets a new password and signs the user in', async () => {
    mockResetPassword.mockResolvedValue({
      token: 'auth-token',
      user: { id: '1', username: 'mfahle', email: 'mfahle@example.com' },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('New password'), 'new password!');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new password!');
    await userEvent.click(screen.getByRole('button', { name: 'Set New Password' }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('abc', 'new password!');
    });
    expect(mockSetSession).toHaveBeenCalledWith({
      accessToken: 'auth-token',
      user: { id: '1', username: 'mfahle', email: 'mfahle@example.com' },
    });
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});
