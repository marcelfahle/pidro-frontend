import { Bot } from 'lucide-react';

/**
 * PlayerAvatar — the canonical round player avatar (in-game seats / HUD).
 *
 * Circular to match the new identity system; covers the states a live table
 * needs: initials / photo / bot / empty seat, presence dot, active-turn ring,
 * and the dimmed (disconnected / passed) treatment. The richer ring+level+coin
 * fusion lives in `IdentityBadge` — used where we know the player's rank.
 */

export type PlayerAvatarState = 'normal' | 'active' | 'dimmed';

interface PlayerAvatarProps {
  /** Initials/letter shown when there's no photo. */
  initial?: string;
  src?: string;
  size?: number;
  isBot?: boolean;
  isVacant?: boolean;
  state?: PlayerAvatarState;
  /** Presence dot: true = online (green), false = offline (gray), undefined = none. */
  online?: boolean;
  className?: string;
}

export function PlayerAvatar({
  initial = '?',
  src,
  size = 44,
  isBot = false,
  isVacant = false,
  state = 'normal',
  online,
  className = '',
}: PlayerAvatarProps) {
  const ring =
    state === 'active'
      ? '0 0 0 2px rgba(67,245,255,0.7), 0 0 14px rgba(67,245,255,0.45)'
      : 'inset 0 2px 6px rgba(0,0,0,0.5)';

  const dotColor = online ? '#4AE06A' : 'rgba(180,200,215,0.55)';

  return (
    <div
      className={`relative shrink-0 ${state === 'dimmed' ? 'opacity-50' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={state === 'active' ? 'animate-active-turn' : ''}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'var(--pidro-font-display)',
          fontWeight: 700,
          fontSize: size * 0.36,
          background: isVacant
            ? 'transparent'
            : src
              ? '#0d2845'
              : 'linear-gradient(150deg, #2A6088 0%, #123356 55%, #0A2138 100%)',
          border: isVacant
            ? '2px dashed rgba(125,221,255,0.45)'
            : '1px solid rgba(125,221,255,0.4)',
          boxShadow: isVacant ? 'none' : ring,
        }}
      >
        {isVacant ? (
          <span
            className="animate-pulse rounded-full"
            style={{
              width: size * 0.16,
              height: size * 0.16,
              background: 'rgba(125,221,255,0.65)',
            }}
          />
        ) : isBot ? (
          <Bot style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
        ) : src ? (
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial.toUpperCase()
        )}
      </div>

      {online !== undefined && !isVacant && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: '50%',
            background: dotColor,
            border: '2px solid #0a2138',
            boxShadow: online ? '0 0 6px rgba(74,224,106,0.7)' : 'none',
          }}
        />
      )}
    </div>
  );
}
