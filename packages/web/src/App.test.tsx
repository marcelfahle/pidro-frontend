import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

// Mock the auth store to avoid needing the full shared package setup
vi.mock('./stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector({ status: 'unauthenticated', user: null })),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('redirects unauthenticated users to login', () => {
    render(<App />);
    // When unauthenticated, navigating to / should redirect to /login
    expect(window.location.pathname).toBe('/login');
  });
});
