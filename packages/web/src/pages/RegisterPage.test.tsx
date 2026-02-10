import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock('../api/auth', () => ({
  register: vi.fn(),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function mockUnauthenticated() {
  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      status: 'unauthenticated',
      user: null,
      setSession: vi.fn(),
    }),
  );
}

describe('RegisterPage', () => {
  it('renders registration form with all required fields', () => {
    mockUnauthenticated();
    renderRegisterPage();

    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy();
  });

  it('shows link to login page', () => {
    mockUnauthenticated();
    renderRegisterPage();

    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('redirects authenticated users away from register', () => {
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        status: 'authenticated',
        user: { id: '1', username: 'test', email: 'test@test.com' },
        setSession: vi.fn(),
      }),
    );

    renderRegisterPage();

    // Should not show registration form since user is authenticated
    expect(screen.queryByLabelText('Username')).toBeNull();
  });

  it('validates password length on submit', async () => {
    mockUnauthenticated();
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Password must be at least 6 characters')).toBeTruthy();
  });

  it('validates password match on submit', async () => {
    mockUnauthenticated();
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'different123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
  });

  it('validates username length on submit', async () => {
    mockUnauthenticated();
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'ab');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Username must be at least 3 characters')).toBeTruthy();
  });
});
