import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

const mockCreateRoom = vi.fn();
vi.mock('../api/lobby', () => ({
  lobbyApi: {
    createRoom: (...args: unknown[]) => mockCreateRoom(...args),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function mockAuthenticated(overrides: Record<string, unknown> = {}) {
  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      status: 'authenticated',
      user: { id: '1', username: 'testuser', email: 'test@test.com' },
      clearSession: vi.fn(),
      ...overrides,
    }),
  );
}

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('renders primary actions and utility buttons', () => {
    mockAuthenticated();
    renderHomePage();

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Single Player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Multiplayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
  });

  it('navigates to lobby when multiplayer is clicked', async () => {
    mockAuthenticated();
    renderHomePage();

    await userEvent.click(screen.getByRole('button', { name: 'Multiplayer' }));

    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
  });

  it('creates a solo room with bots and navigates to the game', async () => {
    mockAuthenticated();
    mockCreateRoom.mockResolvedValue({ code: 'SOLO1' });
    renderHomePage();

    await userEvent.click(screen.getByRole('button', { name: 'Single Player' }));

    expect(mockCreateRoom).toHaveBeenCalledWith({
      name: "testuser's solo table",
      settings: { min_games: 1, time_limit: 0, private: false },
      seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
      bot_difficulty: 'basic',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/game/SOLO1');
  });

  it('clears the session and returns to login when logging out', async () => {
    const clearSession = vi.fn();
    mockAuthenticated({ clearSession });
    renderHomePage();

    await userEvent.click(screen.getByRole('button', { name: 'Log Out' }));

    expect(clearSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
