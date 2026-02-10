import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

// Mock auth store - returns a selector function
const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders login form with username and password fields', () => {
    // Unauthenticated state
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        status: 'unauthenticated',
        user: null,
        setSession: vi.fn(),
      }),
    );

    renderLoginPage();

    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  it('shows link to register page', () => {
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        status: 'unauthenticated',
        user: null,
        setSession: vi.fn(),
      }),
    );

    renderLoginPage();

    const link = screen.getByRole('link', { name: 'Create one' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/register');
  });

  it('redirects authenticated users away from login', () => {
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        status: 'authenticated',
        user: { id: '1', username: 'test', email: 'test@test.com' },
        setSession: vi.fn(),
      }),
    );

    renderLoginPage();

    // Should not show login form since user is authenticated
    expect(screen.queryByLabelText('Username')).toBeNull();
  });
});
