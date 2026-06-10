import type { SeatStatus } from '@pidro/shared';
import { PlayerAvatar } from '../profile/PlayerAvatar';

/**
 * GamePlayerCard — the DS `TableSeat`: a circular avatar tucked into a
 * rounded name/status pill (the pill slides ~26px behind the circle so the
 * two read as one piece). Opponent names render gold, your team's white;
 * status is always cyan. The active turn pulses the avatar's cyan ring —
 * presence dots are never shown at the table (canon).
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
  compact?: boolean;
  imagePosition?: 'left' | 'right';
  className?: string;
}

export function GamePlayerCard({
  displayName,
  statusText,
  initial,
  isCurrentTurn = false,
  isConnected = true,
  seatStatus = 'normal',
  team = 'them',
  compact = false,
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

  const avatar = (
    <div className="relative z-[2] shrink-0">
      <PlayerAvatar
        initial={initial}
        name={resolvedName}
        size={avatarSize}
        isBot={isBot}
        isVacant={isVacant}
        state={isCurrentTurn ? 'active' : dimmed ? 'dimmed' : 'normal'}
      />
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

  return (
    <div className={`inline-flex items-center ${className}`}>
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
    </div>
  );
}
