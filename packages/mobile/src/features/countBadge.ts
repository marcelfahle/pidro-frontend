/**
 * What a count badge says: nothing at zero, the number up to 99, then 99+
 * so the pill never grows past three characters.
 */
export function countBadgeText(count: number): string | null {
  if (!(count > 0)) return null;
  return count > 99 ? '99+' : String(count);
}
