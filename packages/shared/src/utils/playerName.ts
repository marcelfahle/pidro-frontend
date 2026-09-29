const GENERATED_GUEST_USERNAME = /^guest_[A-Z0-9]{8}$/i;

export function isGeneratedGuestUsername(username: unknown): username is string {
  return typeof username === 'string' && GENERATED_GUEST_USERNAME.test(username.trim());
}

/**
 * Public names are usernames, except generated guest handles use the public
 * name chosen at guest creation. A stable user ID is never a name fallback.
 */
export function publicPlayerName(
  username: unknown,
  fallback = 'Player',
  displayName?: unknown,
): string {
  if (
    isGeneratedGuestUsername(username) &&
    typeof displayName === 'string' &&
    displayName.trim()
  ) {
    return displayName.trim();
  }
  return typeof username === 'string' && username.trim() ? username : fallback;
}
