import type { PlayerRank, SeatStatus } from '@pidro/shared';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import type { SkillTier } from '../profile/ranking';
import { DealerChip } from './DealerChip';

/**
 * GamePlayerCard — the DS `TableSeat`: a circular avatar tucked into a
 * rounded name/status pill. Opponent names render gold, your team's white.
 *
 * Progression at the table: the avatar wears the level chip (its metal is
 * the skill tier) but never the dedication ring — in-game, the ring slot
 * belongs to the turn timer, which drains around the active player's
 * avatar. The dealer coin pins to the pill's outer top corner.
 */

interface GamePlayerCardProps {
  displayName: string;
  roleLabel?: string;
  statusText: string;
  initial: string;
  isYou?: boolean;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  isConnected?: boolean;
  seatStatus?: SeatStatus;
  /** Opponents ('them') get gold names; you + partner ('us') get white. */
  team?: 'us' | 'them';
  /** Level + skill tier worn on the avatar (number = level, metal = skill). */
  rank?: PlayerRank | null;
  /** Turn clock, 0–1 remaining — rendered as a draining ring on the avatar. */
  timerProgress?: number | null;
  compact?: boolean;
  /**
   * Drop the pill box: circle + floating text only. For the tightest
   * portrait screens (<390px) where the rectangle crowds the table.
   */
  bare?: boolean;
  imagePosition?: 'left' | 'right';
  className?: string;
}

export function GamePlayerCard({
  displayName,
  statusText,
  initial,
  isDealer = false,
  isCurrentTurn = false,
  isConnected = true,
  seatStatus = 'normal',
  team = 'them',
  rank = null,
  timerProgress = null,
  compact = false,
  bare = false,
  imagePosition = 'left',
  className = '',
}: GamePlayerCardProps) {
  const isBot = seatStatus === 'bot_substitute' || seatStatus === 'permanent_bot';
  const isReconnecting = seatStatus === 'reconnecting';
  const isVacant = seatStatus === 'vacant';
  const dimmed = !isVacant && (!isConnected || isReconnecting);

  const resolvedName = isVacant ? 'Open seat' : isBot ? 'Bot' : displayName;
  const resolvedStatus = isVacant ? 'Waiting...' : isReconnecting ? 'Reconnecting...' : statusText;

  const onRight = imagePosition === 'right';
  const avatarSize = compact ? 40 : 50;
  const tuck = Math.round(avatarSize * 0.52);
  const nameColor = team === 'us' ? '#ffffff' : 'var(--pidro-gold)';
  const showTimer = isCurrentTurn && timerProgress != null;

  /* Fixed-size slot: the halo ring and level chip overflow visually without
     shifting the seat layout when the timer appears or the rank loads. */
  const avatar = (
    <div className="relative z-[2] shrink-0" style={{ width: avatarSize, height: avatarSize }}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <PlayerAvatar
          initial={initial}
          name={resolvedName}
          size={avatarSize}
          isBot={isBot}
          isVacant={isVacant}
          state={isCurrentTurn ? 'active' : dimmed ? 'dimmed' : 'normal'}
          timerProgress={showTimer ? Math.max(0, Math.min(1, timerProgress)) : undefined}
          level={rank?.level}
          prestige={rank?.prestige ?? 0}
          tier={(rank?.tier as SkillTier | undefined) ?? undefined}
        />
      </div>
    </div>
  );

  const pill = (
    <div
      className={isCurrentTurn ? 'animate-active-turn' : ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: compact ? 96 : 116,
        maxWidth: compact ? 148 : 168,
        padding: '7px 0',
        paddingLeft: onRight ? 14 : tuck,
        paddingRight: onRight ? tuck : 14,
        marginLeft: onRight ? 0 : -tuck + 6,
        marginRight: onRight ? -tuck + 6 : 0,
        background: 'rgba(10, 32, 60, 0.92)',
        border: `2px solid ${isCurrentTurn ? 'var(--pidro-cyan)' : 'rgba(0,200,255,0.3)'}`,
        borderRadius: 12,
        boxShadow: isCurrentTurn ? '0 0 10px rgba(0,207,255,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        opacity: dimmed ? 0.55 : 1,
        transition: 'border-color var(--pidro-duration) var(--pidro-ease)',
      }}
    >
      <div
        style={{
          fontSize: compact ? 12 : 13,
          fontWeight: 700,
          color: nameColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: onRight ? 'right' : 'left',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {resolvedName}
      </div>
      <div
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          color: isCurrentTurn ? 'var(--pidro-text-cyan)' : 'rgba(0,207,255,0.7)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginTop: 1,
          textAlign: onRight ? 'right' : 'left',
        }}
      >
        {resolvedStatus}
      </div>
    </div>
  );

  /* Bare mode: circle + floating text, no box — the dealer coin docks on
     the avatar's outer top corner since there is no pill to pin to. */
  if (bare) {
    const text = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 92,
          opacity: dimmed ? 0.55 : 1,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: nameColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: onRight ? 'right' : 'left',
            textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          }}
        >
          {resolvedName}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: isCurrentTurn ? 'var(--pidro-text-cyan)' : 'rgba(0,207,255,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 1,
            textAlign: onRight ? 'right' : 'left',
            textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          }}
        >
          {resolvedStatus}
        </div>
      </div>
    );

    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        {onRight ? (
          <>
            {text}
            {avatar}
          </>
        ) : (
          <>
            {avatar}
            {text}
          </>
        )}
        {isDealer && (
          <DealerChip
            size={18}
            className={`absolute -top-1.5 z-[3] ${onRight ? 'right-0' : 'left-0'} ${
              onRight ? 'translate-x-1' : '-translate-x-1'
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {onRight ? (
        <>
          {pill}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {pill}
        </>
      )}
      {isDealer && (
        <DealerChip
          size={20}
          className={`absolute -top-2 z-[3] ${onRight ? '-left-1.5' : '-right-1.5'}`}
        />
      )}
    </div>
  );
}
