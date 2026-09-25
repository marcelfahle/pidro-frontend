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
      seats: { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' },
    });
    expect(mockCreateRoom.mock.calls[0][0]).not.toHaveProperty('bot_difficulty');
    expect(mockCreateRoom.mock.calls[0][0]).not.toHaveProperty('settings');
    expect(mockNavigate).toHaveBeenCalledWith('/game/SOLO1');
  });

  it('caps the generated solo table name at 60 characters', async () => {
    const username = 'u'.repeat(70);
    mockAuthenticated({ user: { id: '1', username, email: 'test@test.com' } });
    mockCreateRoom.mockResolvedValue({ code: 'SOLO2' });
    renderHomePage();

    await userEvent.click(screen.getByRole('button', { name: 'Single Player' }));

    const request = mockCreateRoom.mock.calls[0][0] as { name: string };
    expect(request.name.length).toBeLessThanOrEqual(60);
    expect(request.name.startsWith('u'.repeat(60))).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/game/SOLO2');
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
