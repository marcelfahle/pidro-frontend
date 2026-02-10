import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyPage } from './LobbyPage';

// Mock stores with selector pattern matching existing tests
const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

const mockUseLobbyStore = vi.fn();
vi.mock('@pidro/shared', () => ({
  useLobbyStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseLobbyStore(selector),
}));

// Mock lobby channel — the hook connects to a WebSocket channel;
// in tests we just verify it gets called
const mockUseLobbyChannel = vi.fn();
vi.mock('../channels/useLobbyChannel', () => ({
  useLobbyChannel: () => mockUseLobbyChannel(),
}));

// Mock lobby API
const mockCreateRoom = vi.fn();
const mockJoinRoom = vi.fn();
vi.mock('../api/lobby', () => ({
  lobbyApi: {
    listRooms: vi.fn().mockResolvedValue({ rooms: [] }),
    createRoom: (...args: unknown[]) => mockCreateRoom(...args),
    joinRoom: (...args: unknown[]) => mockJoinRoom(...args),
  },
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const defaultAuthState = {
  status: 'authenticated',
  user: { id: '1', username: 'testuser', email: 'test@test.com' },
  clearSession: vi.fn(),
};

const emptyLobbyState = {
  rooms: [],
  stats: { online_players: 0, active_games: 0 },
};

function setupMocks(
  authOverrides: Record<string, unknown> = {},
  lobbyOverrides: Record<string, unknown> = {},
) {
  const authState = { ...defaultAuthState, ...authOverrides };
  const lobbyState = { ...emptyLobbyState, ...lobbyOverrides };

  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector(authState),
  );
  mockUseLobbyStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector(lobbyState),
  );
}

function renderLobby() {
  return render(
    <MemoryRouter initialEntries={['/lobby']}>
      <LobbyPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LobbyPage', () => {
  it('renders header with username and sign out button', () => {
    setupMocks();
    renderLobby();

    expect(screen.getByText('testuser')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
  });

  it('connects lobby channel for real-time updates', () => {
    setupMocks();
    renderLobby();

    // useLobbyChannel should be called to establish WebSocket connection
    expect(mockUseLobbyChannel).toHaveBeenCalled();
  });

  it('shows empty state when no waiting rooms exist', () => {
    setupMocks();
    renderLobby();

    expect(screen.getByText('No games available. Create one!')).toBeTruthy();
  });

  it('shows room table when waiting rooms exist', () => {
    setupMocks(
      {},
      {
        rooms: [
          {
            code: 'ABC123',
            name: "Alice's game",
            status: 'waiting',
            player_count: 2,
            max_players: 4,
            available_positions: ['east', 'west'],
          },
        ],
      },
    );
    renderLobby();

    expect(screen.getByText("Alice's game")).toBeTruthy();
    expect(screen.getByText('2/4')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Join' })).toBeTruthy();
  });

  it('shows Create Game button that opens modal', async () => {
    setupMocks();
    renderLobby();

    const createButton = screen.getByRole('button', { name: 'Create Game' });
    expect(createButton).toBeTruthy();

    await userEvent.click(createButton);

    // Modal should now be visible with its title
    expect(screen.getByRole('dialog', { name: 'Create Game' })).toBeTruthy();
  });

  it('creates game and navigates to game page on submit', async () => {
    setupMocks();
    mockCreateRoom.mockResolvedValue({ code: 'NEW123', room: {} });
    renderLobby();

    // Open modal
    await userEvent.click(screen.getByRole('button', { name: 'Create Game' }));

    // Submit the form (name defaults to "{username}'s game")
    const submitButtons = screen.getAllByRole('button', { name: 'Create Game' });
    // The modal footer has a second "Create Game" button
    const submitButton = submitButtons[submitButtons.length - 1];
    await userEvent.click(submitButton);

    expect(mockCreateRoom).toHaveBeenCalledWith({
      name: "testuser's game",
      settings: { min_games: 1, time_limit: 0, private: false },
      seats: { seat_2: 'open', seat_3: 'open', seat_4: 'open' },
    });
    expect(mockNavigate).toHaveBeenCalledWith('/game/NEW123');
  });

  it('joins a room and navigates to game page', async () => {
    setupMocks(
      {},
      {
        rooms: [
          {
            code: 'JOIN1',
            name: 'Test Room',
            status: 'waiting',
            player_count: 1,
            max_players: 4,
            available_positions: ['east', 'south', 'west'],
          },
        ],
      },
    );
    mockJoinRoom.mockResolvedValue({ room: {}, assigned_position: 'east' });
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(mockJoinRoom).toHaveBeenCalledWith('JOIN1');
    expect(mockNavigate).toHaveBeenCalledWith('/game/JOIN1');
  });

  it('shows online player count when available', () => {
    setupMocks({}, { stats: { online_players: 5, active_games: 2 } });
    renderLobby();

    expect(screen.getByText('5 online')).toBeTruthy();
  });

  it('navigates to login on sign out', async () => {
    const clearSession = vi.fn();
    setupMocks({ clearSession });
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(clearSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
