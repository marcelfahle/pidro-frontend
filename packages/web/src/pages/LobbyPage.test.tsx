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
const mockWatchRoom = vi.fn();
vi.mock('../api/profile', () => ({ profileApi: { getPlayer: vi.fn() } }));
vi.mock('../api/lobby', () => ({
  lobbyApi: {
    listRooms: vi.fn().mockResolvedValue({ rooms: [] }),
    createRoom: (...args: unknown[]) => mockCreateRoom(...args),
    joinRoom: (...args: unknown[]) => mockJoinRoom(...args),
    watchRoom: (...args: unknown[]) => mockWatchRoom(...args),
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
  lobby: {
    my_rejoinable: [],
    open_tables: [],
    substitute_needed: [],
    spectatable: [],
  },
  stats: { online_players: 0, active_games: 0 },
};

function setupMocks(
  authOverrides: Record<string, unknown> = {},
  lobbyOverrides: Record<string, unknown> = {},
) {
  const authState = { ...defaultAuthState, ...authOverrides };
  const lobbyState = {
    ...emptyLobbyState,
    ...lobbyOverrides,
    lobby: { ...emptyLobbyState.lobby, ...(lobbyOverrides.lobby as object) },
  };

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
  it('renders the header and labeled navigation actions', () => {
    setupMocks();
    renderLobby();

    expect(screen.getByText('Create or Join Table')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Game' })).toBeTruthy();
  });

  it('connects lobby channel for real-time updates', () => {
    setupMocks();
    renderLobby();

    // useLobbyChannel should be called to establish WebSocket connection
    expect(mockUseLobbyChannel).toHaveBeenCalled();
  });

  it('shows empty state when no actionable rooms exist', () => {
    setupMocks();
    renderLobby();

    expect(screen.getByText('No games available. Create one!')).toBeTruthy();
  });

  it('does not show an empty Open Tables section when there are games to watch', () => {
    setupMocks({}, { lobby: { spectatable: [{ code: 'WATCH', name: 'Watch table' }] } });
    renderLobby();
    expect(screen.queryByText('Open Tables')).toBeNull();
    expect(screen.queryByText('No games available. Create one!')).toBeNull();
    expect(screen.getByRole('button', { name: 'Watch' })).toBeTruthy();
  });

  it('clears a search with no matches and restores the room actions', async () => {
    setupMocks({}, { lobby: { open_tables: [{ code: 'OPEN', name: 'Friendly table' }] } });
    renderLobby();
    await userEvent.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByText('No matching tables')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('button', { name: 'Join' })).toBeTruthy();
  });

  it('prevents competing room actions during Watch and exposes a retryable error', async () => {
    setupMocks(
      {},
      {
        lobby: {
          open_tables: [{ code: 'OPEN', name: 'Friendly table' }],
          spectatable: [{ code: 'WATCH', name: 'Watch table' }],
        },
      },
    );
    let rejectWatch!: (error: Error) => void;
    mockWatchRoom.mockReturnValue(
      new Promise((_, reject) => {
        rejectWatch = reject;
      }),
    );
    renderLobby();
    await userEvent.click(screen.getByRole('button', { name: 'Watch' }));
    expect(screen.getByRole('button', { name: /Watch$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
    rejectWatch(new Error('Network unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to watch game.');
    expect(screen.getByRole('button', { name: 'Watch' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows room table when waiting rooms exist', () => {
    setupMocks(
      {},
      {
        lobby: {
          open_tables: [
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
      },
    );
    renderLobby();

    expect(screen.getByText("Alice's game")).toBeTruthy();
    expect(screen.getByText(/2\/4 players/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Join' })).toBeTruthy();
  });

  it('shows Create Game action that opens modal', async () => {
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
        lobby: {
          open_tables: [
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

    expect(screen.getByText('Players Online 5')).toBeTruthy();
  });

  it('navigates home on back', async () => {
    setupMocks();
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  // --- Categorized sections ---

  it('shows Your Tables section for rejoinable games', () => {
    setupMocks(
      {},
      {
        lobby: {
          my_rejoinable: [
            {
              code: 'REJOIN1',
              name: 'My Game',
              status: 'playing',
              player_ids: ['1'],
              player_count: 4,
              max_players: 4,
            },
          ],
        },
      },
    );
    renderLobby();

    expect(screen.getByText('Your Tables')).toBeTruthy();
    expect(screen.getByText('My Game')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rejoin' })).toBeTruthy();
  });

  it('renders the backend category even when room status and seats suggest another action', () => {
    const room = {
      code: 'AUTH1',
      name: 'Authoritative Rejoin',
      status: 'waiting',
      available_positions: ['east'],
    };
    setupMocks({}, { lobby: { ...emptyLobbyState.lobby, my_rejoinable: [room] } });
    renderLobby();

    expect(screen.getByRole('button', { name: 'Rejoin' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join' })).toBeNull();
  });

  it('navigates directly to game on Rejoin click', async () => {
    setupMocks(
      {},
      {
        lobby: {
          my_rejoinable: [
            {
              code: 'REJOIN2',
              name: 'Rejoin Game',
              status: 'playing',
              player_ids: ['1'],
              player_count: 4,
              max_players: 4,
            },
          ],
        },
      },
    );
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Rejoin' }));

    expect(mockNavigate).toHaveBeenCalledWith('/game/REJOIN2');
    expect(mockJoinRoom).not.toHaveBeenCalled();
  });

  it('shows Need a Player section for games with vacant seats', () => {
    setupMocks(
      {},
      {
        lobby: {
          substitute_needed: [
            {
              code: 'SUB1',
              name: 'Needs Help',
              status: 'playing',
              player_ids: ['other-user'],
              player_count: 3,
              max_players: 4,
              seats: [
                {
                  seat_index: 0,
                  status: 'occupied',
                  player: { id: 'other-user', username: 'Bob' },
                },
                { seat_index: 1, status: 'occupied', player: { id: 'p2', username: 'Eve' } },
                { seat_index: 2, status: 'occupied', player: { id: 'p3', username: 'Dan' } },
                { seat_index: 3, status: 'free', player: null },
              ],
            },
          ],
        },
      },
    );
    renderLobby();

    expect(screen.getByText('Need a Player')).toBeTruthy();
    expect(screen.getByText('Needs Help')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Substitute' })).toBeTruthy();
  });

  it('admits a substitute before navigating to the game', async () => {
    setupMocks(
      {},
      {
        lobby: {
          substitute_needed: [
            {
              code: 'SUB2',
              name: 'Needs Substitute',
              status: 'playing',
              player_ids: ['other-user'],
              available_positions: ['west'],
              seats: [{ seat_index: 3, status: 'free', player: null }],
            },
          ],
        },
      },
    );
    let resolveJoin!: () => void;
    mockJoinRoom.mockReturnValue(new Promise<void>((resolve) => (resolveJoin = resolve)));
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Substitute' }));
    expect(mockJoinRoom).toHaveBeenCalledWith('SUB2');
    expect(mockNavigate).not.toHaveBeenCalled();

    resolveJoin();
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game/SUB2'));
  });

  it('shows Watch section for spectatable games', () => {
    setupMocks(
      {},
      {
        lobby: {
          spectatable: [
            {
              code: 'WATCH1',
              name: 'Full Game',
              status: 'playing',
              player_ids: ['other1', 'other2', 'other3', 'other4'],
              player_count: 4,
              max_players: 4,
              seats: [
                { seat_index: 0, status: 'occupied', player: { id: 'other1', username: 'A' } },
                { seat_index: 1, status: 'occupied', player: { id: 'other2', username: 'B' } },
                { seat_index: 2, status: 'occupied', player: { id: 'other3', username: 'C' } },
                { seat_index: 3, status: 'occupied', player: { id: 'other4', username: 'D' } },
              ],
            },
          ],
        },
      },
    );
    renderLobby();

    expect(screen.getByRole('heading', { level: 3, name: /Watch/ })).toBeTruthy();
    expect(screen.getByText('Full Game')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Watch' })).toBeTruthy();
  });

  it('registers Watch before navigating to the game', async () => {
    setupMocks(
      {},
      {
        lobby: {
          spectatable: [
            {
              code: 'WATCH2',
              name: 'Watch Me',
              status: 'playing',
              player_ids: ['other1'],
              available_positions: [],
              seats: [{ seat_index: 0, status: 'occupied', player: { id: 'other1' } }],
            },
          ],
        },
      },
    );
    let resolveWatch!: () => void;
    mockWatchRoom.mockReturnValue(new Promise<void>((resolve) => (resolveWatch = resolve)));
    renderLobby();

    await userEvent.click(screen.getByRole('button', { name: 'Watch' }));
    expect(mockWatchRoom).toHaveBeenCalledWith('WATCH2');
    expect(mockNavigate).not.toHaveBeenCalled();

    resolveWatch();
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game/WATCH2'));
  });
});
