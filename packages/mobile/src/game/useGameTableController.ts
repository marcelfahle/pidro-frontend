/**
 * Presentation-neutral game-table controller (plan §5.1).
 * Reads the stores + view model and exposes derived state + action handlers so
 * both the legacy RN table and the new Skia table render from one source of truth.
 * Logic mirrors the original GameTable derivations exactly. Decides nothing —
 * the server (Phoenix) stays authoritative; handlers send server-intent payloads.
 */
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { Room, Position } from '@/types/lobby';
import type {
  Card,
  Suit,
  GamePhase,
  LegalAction,
  RelativePosition,
  RelativePlayerView,
  GameViewModel,
  ServerGameState,
} from '@/types/game';
import { useGameStore, useGameViewModel } from '@/stores/game';
import { pushGameAction } from '@/channels/hooks/useGameChannel';

export type GameTableController = {
  roomTitle: string;
  viewModel: GameViewModel | null;
  serverState: ServerGameState | null;
  youPositionAbs: Position | null;
  isChannelJoined: boolean;
  phase: GamePhase;
  trumpSuit: Suit | null;
  players: RelativePlayerView[];
  currentTurnRelative: RelativePosition | null;
  yourHand: Card[] | null;
  yourCardCount: number | null;
  currentTrick: unknown;
  completedTricks: unknown;
  legalActions: LegalAction[];
  isYourTurn: boolean;
  isPlayingTurn: boolean;
  isDeclaringPhase: boolean;
  showTrumpSelection: boolean;
  isGameOver: boolean;
  isSecondDeal: boolean;
  isPlayingCard: boolean;
  getCardCountForPlayer: (absPosition: Position | null) => number | null;
  handlePlayCard: (card: Card) => Promise<void> | void;
  handleDeclareTrump: (suit: Suit) => Promise<void> | void;
  handleSelectHand: (cards: Card[]) => Promise<void> | void;
  showActionError: (action: string, err: unknown) => void;
};

export function useGameTableController(room?: Room): GameTableController {
  const viewModel = useGameViewModel();
  const { serverState, youPositionAbs, isChannelJoined, legalActions } = useGameStore(
    useShallow((s) => ({
      serverState: s.serverState,
      youPositionAbs: s.youPositionAbs,
      isChannelJoined: s.isChannelJoined,
      legalActions: s.legalActions,
    }))
  );

  const roomTitle = room ? room.name || room.metadata?.name || room.code : '';
  const phase = viewModel?.phase ?? 'bidding';
  const trumpSuit = viewModel?.trumpSuit ?? null;
  const players = useMemo(() => viewModel?.players ?? [], [viewModel]);
  const currentTurnRelative = viewModel?.currentTurnRelative ?? null;

  const yourHand = useMemo(() => {
    if (!serverState || !youPositionAbs) return null;
    const hand = serverState.players?.[youPositionAbs]?.hand;
    return Array.isArray(hand) ? hand : null;
  }, [serverState, youPositionAbs]);

  const yourCardCount = useMemo(() => {
    if (!serverState || !youPositionAbs) return null;
    const view = serverState.players?.[youPositionAbs];
    if (!view) return null;
    const { hand, card_count } = view;
    if (Array.isArray(hand)) return hand.length;
    if (typeof hand === 'number') return hand;
    if (typeof card_count === 'number') return card_count;
    return null;
  }, [serverState, youPositionAbs]);

  const currentTrick = useMemo(() => {
    if (!serverState) return null;
    const trick = (serverState as unknown as Record<string, unknown>).current_trick;
    if (!trick) return null;
    if (typeof trick === 'object' && 'plays' in (trick as object)) {
      return (trick as { plays: unknown }).plays;
    }
    return trick;
  }, [serverState]);

  const completedTricks = useMemo(() => {
    if (!serverState) return null;
    return (serverState as unknown as Record<string, unknown>).tricks ?? null;
  }, [serverState]);

  const getCardCountForPlayer = useCallback(
    (absPosition: Position | null): number | null => {
      if (!absPosition || !serverState?.players) return null;
      const view = serverState.players[absPosition];
      if (!view) return null;
      const { hand, card_count } = view;
      if (typeof hand === 'number') return hand;
      if (Array.isArray(hand)) return hand.length;
      if (typeof card_count === 'number') return card_count;
      return null;
    },
    [serverState]
  );

  const isYourTurn = players.find((p) => p.relativePosition === 'south')?.isCurrentTurn ?? false;
  const isPlayingTurn = isYourTurn && phase === 'playing';
  const isDeclaringPhase =
    phase === 'declaring' || phase === 'declaring_trump' || phase === 'trump_declaration';
  const showTrumpSelection = isDeclaringPhase && isYourTurn;
  const isGameOver =
    phase === 'complete' || phase === 'game_over' || (phase as string) === 'finished';
  const isSecondDeal = phase === 'second_deal' && !!yourHand && yourHand.length > 6;

  const [isPlayingCard, setIsPlayingCard] = useState(false);

  const showActionError = useCallback((action: string, err: unknown) => {
    const message =
      typeof err === 'object' && err !== null && 'reason' in err
        ? String((err as { reason: string }).reason)
        : `${action} failed`;
    Alert.alert('Action Failed', message);
  }, []);

  const handleDeclareTrump = useCallback(
    async (suit: Suit) => {
      try {
        const promise = pushGameAction('declare_trump', { suit });
        if (!promise) return;
        await promise;
      } catch (error) {
        showActionError('Declare trump', error);
      }
    },
    [showActionError]
  );

  const handlePlayCard = useCallback(
    async (card: Card) => {
      if (isPlayingCard || !isPlayingTurn) return;
      setIsPlayingCard(true);
      try {
        const promise = pushGameAction('play_card', { card: { rank: card.rank, suit: card.suit } });
        if (!promise) return;
        await promise;
      } catch (error) {
        showActionError('Play card', error);
      } finally {
        setIsPlayingCard(false);
      }
    },
    [isPlayingCard, isPlayingTurn, showActionError]
  );

  const handleSelectHand = useCallback(
    async (cards: Card[]) => {
      const promise = pushGameAction('select_hand', {
        cards: cards.map((c) => ({ rank: c.rank, suit: c.suit })),
      });
      if (!promise) return;
      try {
        await promise;
      } catch (error) {
        showActionError('Select hand', error);
      }
    },
    [showActionError]
  );

  return {
    roomTitle,
    viewModel,
    serverState,
    youPositionAbs,
    isChannelJoined,
    phase,
    trumpSuit,
    players,
    currentTurnRelative,
    yourHand,
    yourCardCount,
    currentTrick,
    completedTricks,
    legalActions,
    isYourTurn,
    isPlayingTurn,
    isDeclaringPhase,
    showTrumpSelection,
    isGameOver,
    isSecondDeal,
    isPlayingCard,
    getCardCountForPlayer,
    handlePlayCard,
    handleDeclareTrump,
    handleSelectHand,
    showActionError,
  };
}
