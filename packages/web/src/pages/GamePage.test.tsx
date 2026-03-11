import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GamePage } from './GamePage';

// Mock auth store
const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

// Mock game store - needs to support both direct calls and useShallow selectors
const mockGameStoreState: Record<string, unknown> = {};
const mockInitFromRoom = vi.fn();
const mockReset = vi.fn();
vi.mock('@pidro/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@pidro/shared')>();
  return {
    ...actual,
    useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
      selector(mockGameStoreState),
    useGameViewModel: () => mockGameStoreState._viewModel ?? null,
  };
});

// Mock zustand useShallow - pass through selector
vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

// Mock game channel
const mockUseGameChannel = vi.fn();
vi.mock('../channels/useGameChannel', () => ({
  useGameChannel: (opts: Record<string, unknown>) => mockUseGameChannel(opts),
  pushGameAction: vi.fn(),
}));

// Mock lobby API
const mockGetRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockWatchRoom = vi.fn();
const mockUnwatchRoom = vi.fn();
const mockCreateRoom = vi.fn();
vi.mock('../api/lobby', () => ({
  lobbyApi: {
    getRoom: (...args: unknown[]) => mockGetRoom(...args),
    leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
    watchRoom: (...args: unknown[]) => mockWatchRoom(...args),
    unwatchRoom: (...args: unknown[]) => mockUnwatchRoom(...args),
    createRoom: (...args: unknown[]) => mockCreateRoom(...args),
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

function renderGamePage(code = 'TEST1') {
  return render(
    <MemoryRouter initialEntries={[`/game/${code}`]}>
      <Routes>
        <Route path="/game/:code" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setupDefaults(overrides: Record<string, unknown> = {}) {
  const authState = {
    status: 'authenticated',
    user: { id: 'user-1', username: 'testplayer', email: 'test@test.com' },
    ...overrides,
  };

  mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
    selector(authState),
  );

  Object.assign(mockGameStoreState, {
    serverState: null,
    playerMeta: {
      north: {
        position: 'north',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      east: {
        position: 'east',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      south: {
        position: 'south',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
      west: {
        position: 'west',
        playerId: null,
        username: null,
        isYou: false,
        isTeammate: false,
        isOpponent: false,
        isConnected: false,
      },
    },
    readyPlayers: [],
    turnTimer: null,
    youPositionAbs: null,
    role: null,
    isChannelJoined: false,
    lastError: null,
    initFromRoom: mockInitFromRoom,
    setError: vi.fn(),
    reset: mockReset,
    _viewModel: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store state
  for (const key of Object.keys(mockGameStoreState)) {
    delete mockGameStoreState[key];
  }
});

describe('GamePage', () => {
  it('shows loading spinner while fetching room data', () => {
    setupDefaults();
    // getRoom returns a pending promise (never resolves during test)
    mockGetRoom.mockReturnValue(new Promise(() => {}));

    renderGamePage();

    expect(screen.getByText('Loading game...')).toBeTruthy();
  });

  it('shows error and back button when room fetch fails', async () => {
    setupDefaults();
    mockGetRoom.mockRejectedValue(new Error('Not found'));

    renderGamePage();

    // Wait for the error message to appear
    const errorText = await screen.findByText(
      'Failed to connect to server. Please check your connection.',
    );
    expect(errorText).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeTruthy();
  });

  it('initializes game store and connects channel after fetching room', async () => {
    setupDefaults();
    const mockRoom = { code: 'TEST1', status: 'waiting', seats: [] };
    mockGetRoom.mockResolvedValue(mockRoom);

    renderGamePage();

    // Wait for the async room fetch to complete
    await waitFor(() => {
      expect(mockInitFromRoom).toHaveBeenCalledWith({
        room: mockRoom,
        youPlayerId: 'user-1',
      });
    });

    // Channel should be connected with the room code
    expect(mockUseGameChannel).toHaveBeenCalledWith(expect.objectContaining({ roomCode: 'TEST1' }));
  });

  it('renders waiting room when no game state exists', async () => {
    setupDefaults();
    // Simulate room fetch completing quickly - set up playerMeta as if initFromRoom ran
    Object.assign(mockGameStoreState, {
      playerMeta: {
        north: {
          position: 'north',
          playerId: null,
          username: null,
          isYou: false,
          isTeammate: false,
          isOpponent: false,
          isConnected: false,
        },
        east: {
          position: 'east',
          playerId: null,
          username: null,
          isYou: false,
          isTeammate: false,
          isOpponent: false,
          isConnected: false,
        },
        south: {
          position: 'south',
          playerId: 'user-1',
          username: 'testplayer',
          isYou: true,
          isTeammate: false,
          isOpponent: false,
          isConnected: true,
        },
        west: {
          position: 'west',
          playerId: null,
          username: null,
          isYou: false,
          isTeammate: false,
          isOpponent: false,
          isConnected: false,
        },
      },
    });
    mockGetRoom.mockResolvedValue({ code: 'TEST1', status: 'waiting', seats: [] });

    renderGamePage();

    // Wait for loading to finish
    const roomCode = await screen.findByText('TEST1');
    expect(roomCode).toBeTruthy();

    // Should see waiting room elements
    expect(screen.getByText('Room Code')).toBeTruthy();
    expect(screen.getByText('Waiting for players... (1/4)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leave Room' })).toBeTruthy();
  });

  it('navigates back to lobby when Leave Room is clicked', async () => {
    setupDefaults();
    mockGetRoom.mockResolvedValue({ code: 'TEST1', status: 'waiting', seats: [] });
    mockLeaveRoom.mockResolvedValue(undefined);

    renderGamePage();

    const leaveButton = await screen.findByRole('button', { name: 'Leave Room' });
    await userEvent.click(leaveButton);

    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    expect(mockLeaveRoom).toHaveBeenCalledWith('TEST1');
  });

  it('shows channel error with back button when channel fails', async () => {
    setupDefaults();
    Object.assign(mockGameStoreState, {
      lastError: 'Unable to join game room.',
      isChannelJoined: false,
    });
    mockGetRoom.mockResolvedValue({ code: 'TEST1', status: 'waiting', seats: [] });

    renderGamePage();

    const errorText = await screen.findByText('Unable to join game room.');
    expect(errorText).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeTruthy();
  });

  it('shows the inactivity title when the server force-disconnects the player', async () => {
    setupDefaults();
    Object.assign(mockGameStoreState, {
      lastError:
        'Disconnected for inactivity after repeated turn timeouts. Retry to rejoin when ready.',
      isChannelJoined: false,
    });
    mockGetRoom.mockResolvedValue({ code: 'TEST1', status: 'waiting', seats: [] });

    renderGamePage();

    const title = await screen.findByText('Disconnected for Inactivity');
    expect(title).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('offers a watch-as-spectator fallback when reconnection grace expires', async () => {
    setupDefaults();
    Object.assign(mockGameStoreState, {
      lastError: 'reconnection grace period expired',
      isChannelJoined: false,
    });

    mockGetRoom
      .mockResolvedValueOnce({ code: 'TEST1', status: 'playing', seats: [] })
      .mockResolvedValueOnce({ code: 'TEST1', status: 'playing', seats: [] });
    mockWatchRoom.mockResolvedValue({ code: 'TEST1', status: 'playing', seats: [] });

    renderGamePage();

    const watchButton = await screen.findByRole('button', { name: 'Watch as Spectator' });
    await userEvent.click(watchButton);

    await waitFor(() => {
      expect(mockWatchRoom).toHaveBeenCalledWith('TEST1');
      expect(mockGetRoom).toHaveBeenCalledTimes(2);
    });
  });

  it('resets game store on unmount', () => {
    setupDefaults();
    mockGetRoom.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderGamePage();
    unmount();

    expect(mockReset).toHaveBeenCalled();
  });

  it('creates a new room with same seat config when Play Again is clicked', async () => {
    setupDefaults();

    // Room has 2 bots (east and west) and 1 human (south)
    const mockRoom = {
      code: 'TEST1',
      name: 'Fun Game',
      status: 'playing',
      seats: [
        { seat_index: 0, status: 'occupied', player: { id: 'user-1', username: 'testplayer' } },
        {
          seat_index: 1,
          status: 'occupied',
          player: { id: 'bot-1', username: 'Bot1', is_bot: true },
        },
        { seat_index: 2, status: 'occupied', player: { id: 'user-2', username: 'other' } },
        {
          seat_index: 3,
          status: 'occupied',
          player: { id: 'bot-2', username: 'Bot2', is_bot: true },
        },
      ],
    };
    mockGetRoom.mockResolvedValue(mockRoom);
    mockCreateRoom.mockResolvedValue({ code: 'NEW1', room: { code: 'NEW1' } });

    // Set up game-over state with a complete viewModel so GameTable + GameOverOverlay can render
    const gameOverViewModel = {
      phase: 'game_over',
      roomCode: 'TEST1',
      viewerPositionAbsolute: 'south',
      trumpSuit: null,
      dealerAbsolute: null,
      currentTrick: [],
      completedTricks: [],
      players: [
        {
          absolutePosition: 'north',
          relativePosition: 'north',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'testplayer',
        },
        {
          absolutePosition: 'east',
          relativePosition: 'east',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'Bot1',
        },
        {
          absolutePosition: 'south',
          relativePosition: 'south',
          isYou: true,
          isCurrentTurn: false,
          isConnected: true,
          username: 'other',
        },
        {
          absolutePosition: 'west',
          relativePosition: 'west',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'Bot2',
        },
      ],
    };

    Object.assign(mockGameStoreState, {
      serverState: {
        phase: 'game_over',
        current_player: null,
        players: {
          north: { hand: 0, card_count: 0 },
          east: { hand: 0, card_count: 0 },
          south: { hand: 0, card_count: 0 },
          west: { hand: 0, card_count: 0 },
        },
        scores: { north_south: 62, east_west: 40 },
      },
      legalActions: [],
      isChannelJoined: true,
      _viewModel: gameOverViewModel,
    });

    renderGamePage();

    // Wait for room fetch + game over overlay to appear
    const playAgainBtn = await screen.findByRole('button', { name: 'Play Again' });
    await userEvent.click(playAgainBtn);

    // Should create room preserving bot seats from original room
    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fun Game',
          seats: { seat_2: 'ai', seat_3: 'open', seat_4: 'ai' },
          bot_difficulty: 'basic',
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/game/NEW1');
  });

  it('shows toast when Play Again room creation fails', async () => {
    setupDefaults();

    const mockRoom = {
      code: 'TEST1',
      name: 'My Game',
      status: 'playing',
      seats: [
        { seat_index: 0, status: 'occupied', player: { id: 'user-1', username: 'testplayer' } },
        { seat_index: 1, status: 'occupied', player: { id: 'user-2', username: 'p2' } },
        { seat_index: 2, status: 'occupied', player: { id: 'user-3', username: 'p3' } },
        { seat_index: 3, status: 'occupied', player: { id: 'user-4', username: 'p4' } },
      ],
    };
    mockGetRoom.mockResolvedValue(mockRoom);
    mockCreateRoom.mockRejectedValue(new Error('Server error'));

    const gameOverViewModel = {
      phase: 'complete',
      roomCode: 'TEST1',
      viewerPositionAbsolute: 'south',
      trumpSuit: null,
      dealerAbsolute: null,
      currentTrick: [],
      completedTricks: [],
      players: [
        {
          absolutePosition: 'north',
          relativePosition: 'north',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'testplayer',
        },
        {
          absolutePosition: 'east',
          relativePosition: 'east',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'p2',
        },
        {
          absolutePosition: 'south',
          relativePosition: 'south',
          isYou: true,
          isCurrentTurn: false,
          isConnected: true,
          username: 'p3',
        },
        {
          absolutePosition: 'west',
          relativePosition: 'west',
          isYou: false,
          isCurrentTurn: false,
          isConnected: true,
          username: 'p4',
        },
      ],
    };

    Object.assign(mockGameStoreState, {
      serverState: {
        phase: 'complete',
        current_player: null,
        players: {
          north: { hand: 0, card_count: 0 },
          east: { hand: 0, card_count: 0 },
          south: { hand: 0, card_count: 0 },
          west: { hand: 0, card_count: 0 },
        },
        scores: { north_south: 30, east_west: 62 },
      },
      legalActions: [],
      isChannelJoined: true,
      _viewModel: gameOverViewModel,
    });

    renderGamePage();

    const playAgainBtn = await screen.findByRole('button', { name: 'Play Again' });
    await userEvent.click(playAgainBtn);

    // Should show error toast, not navigate
    const errorToast = await screen.findByText('Failed to create new game');
    expect(errorToast).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/game/'));
  });
});
