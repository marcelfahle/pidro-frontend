import type { Position } from '../types/lobby';
import type { RelativePosition } from '../types/game';

export const POS_ORDER: Position[] = ['north', 'east', 'south', 'west'];

export const POSITION_TO_INDEX: Record<Position, number> = {
  north: 0,
  east: 1,
  south: 2,
  west: 3,
};

export const INDEX_TO_POSITION: Position[] = POS_ORDER;

export function mapAbsoluteToRelative(abs: Position, youAbs: Position): RelativePosition {
  const youIdx = POS_ORDER.indexOf(youAbs);
  const idx = POS_ORDER.indexOf(abs);
  const offset = (2 - youIdx + POS_ORDER.length) % POS_ORDER.length;
  const relIdx = (idx + offset) % POS_ORDER.length;
  return POS_ORDER[relIdx] as RelativePosition;
}

export function mapRelativeToAbsolute(rel: RelativePosition, youAbs: Position): Position {
  const youIdx = POS_ORDER.indexOf(youAbs);
  const relIdx = POS_ORDER.indexOf(rel);
  const offset = (youIdx - 2 + POS_ORDER.length) % POS_ORDER.length;
  const absIdx = (relIdx + offset) % POS_ORDER.length;
  return POS_ORDER[absIdx];
}

export function getTeammatePositions(youAbs: Position): Position[] {
  if (youAbs === 'north' || youAbs === 'south') {
    return ['north', 'south'].filter((p) => p !== youAbs) as Position[];
  }
  return ['east', 'west'].filter((p) => p !== youAbs) as Position[];
}

export function isTeammate(youAbs: Position, otherAbs: Position): boolean {
  return getTeammatePositions(youAbs).includes(otherAbs);
}
