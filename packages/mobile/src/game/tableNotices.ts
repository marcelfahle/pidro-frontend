export type TableNotice = { message: string; variant: 'warning' | 'success' | 'error' };
export type QueuedTableNotice = TableNotice & { roomCode: string };

export function enqueueTableNotice(
  current: QueuedTableNotice[],
  notice: TableNotice,
  roomCode: string
): QueuedTableNotice[] {
  const roomNotices = current.filter((entry) => entry.roomCode === roomCode);
  const tail = roomNotices[roomNotices.length - 1];
  if (tail?.message === notice.message && tail.variant === notice.variant) return roomNotices;

  const next = [...roomNotices, { ...notice, roomCode }];
  return next.length <= 3 ? next : [next[0], ...next.slice(-2)];
}
