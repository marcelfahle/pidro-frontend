/** Public names are usernames, never display_name or a stable user ID. */
export function publicPlayerName(username: unknown, fallback = 'Player'): string {
  return typeof username === 'string' && username.trim() ? username : fallback;
}
