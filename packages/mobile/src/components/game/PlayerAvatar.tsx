import { View, Text, Image, StyleSheet } from 'react-native';

import type { RelativePosition } from '@/types/game';
import { OpponentHand } from './OpponentHand';

const avatar1 = require('~/assets/images/avatar1.png');
const avatar2 = require('~/assets/images/avatar2.png');

const AVATARS = [avatar1, avatar2];

interface PlayerAvatarProps {
  position: RelativePosition;
  playerName: string | null;
  isCurrentPlayer?: boolean;
  isTeammate?: boolean;
  isCurrentTurn?: boolean;
  lastMove?: string | null;
  cardCount?: number | null;
}

const COLORS = {
  white: '#ffffff',
  white60: 'rgba(255, 255, 255, 0.6)',
  white15: 'rgba(255, 255, 255, 0.15)',
  blue200: 'rgb(191, 219, 254)',
  blue500_90: 'rgba(59, 130, 246, 0.9)',
  emerald500_70: 'rgba(16, 185, 129, 0.7)',
  yellow300_80: 'rgba(253, 224, 71, 0.8)',
  slate800: 'rgb(30, 41, 59)',
  slate700: 'rgb(51, 65, 85)',
};

const POSITION_STYLES: Record<RelativePosition, object> = {
  north: { top: 0, left: 0, right: 0 },
  south: { bottom: 0, left: 0, right: 0 },
  east: { right: 4, top: '30%', transform: [{ translateY: -50 }] },
  west: { left: 4, top: '30%', transform: [{ translateY: -50 }] },
};

export function PlayerAvatar({
  position,
  playerName,
  isCurrentPlayer,
  isTeammate,
  isCurrentTurn,
  lastMove,
  cardCount,
}: PlayerAvatarProps) {
  const avatarSeed = playerName ?? position;
  const avatar = AVATARS[avatarSeed.charCodeAt(0) % AVATARS.length];

  const badgeColor = isCurrentPlayer
    ? COLORS.blue500_90
    : isTeammate
      ? COLORS.emerald500_70
      : COLORS.slate700;

  const isNorth = position === 'north';
  const isSouth = position === 'south';
  const isEast = position === 'east';
  const isWest = position === 'west';
  const isHorizontal = isNorth || isSouth;
  const visibleCardCount = cardCount ?? null;
  const showOpponentHand = !isCurrentPlayer && visibleCardCount != null && visibleCardCount > 0;

  return (
    <View
      style={[
        styles.container,
        isHorizontal ? styles.containerHorizontal : styles.containerVertical,
        isEast && styles.containerEast,
        isWest && styles.containerWest,
        POSITION_STYLES[position],
      ]}>
      {/* North: cards above avatar */}
      {isNorth && showOpponentHand && (
        <View style={styles.handNorth}>
          <OpponentHand cardCount={visibleCardCount} orientation="horizontal" />
        </View>
      )}

      {/* West: cards to the left of avatar */}
      {isWest && showOpponentHand && (
        <View style={styles.handWest}>
          <OpponentHand cardCount={visibleCardCount} orientation="vertical" />
        </View>
      )}

      <View style={styles.avatarSection}>
        <View style={[styles.avatarContainer, isCurrentTurn && styles.avatarContainerActive]}>
          <Image source={avatar} style={styles.avatarImage} />
        </View>

        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.nameText} numberOfLines={1}>
            {playerName || 'Waiting'}
          </Text>
          {lastMove && <Text style={styles.lastMoveText}>{lastMove}</Text>}
        </View>

        {isCurrentPlayer && <Text style={styles.youLabel}>You</Text>}
      </View>

      {/* East: cards to the right of avatar */}
      {isEast && showOpponentHand && (
        <View style={styles.handEast}>
          <OpponentHand cardCount={visibleCardCount} orientation="vertical" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'column',
  },
  containerVertical: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  containerEast: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerWest: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarSection: {
    alignItems: 'center',
  },

  handNorth: {
    marginBottom: 8,
  },
  handEast: {
    marginLeft: 0,
    marginRight: -10,
  },
  handWest: {
    marginRight: -8,
    marginLeft: -10,
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.slate800,
    borderWidth: 2,
    borderColor: COLORS.white15,
  },
  avatarContainerActive: {
    borderColor: COLORS.yellow300_80,
    borderWidth: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  badge: {
    marginTop: -6,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  lastMoveText: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.white60,
    marginTop: 1,
  },

  youLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.blue200,
  },
});
